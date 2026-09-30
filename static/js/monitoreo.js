let mapa = null;

let capaRancho = null;

let marcadores = new Map();

let intervalo = null;


// ======================================================
// CREAR MAPA
// ======================================================

function crearMapa() {

    mapa = L.map("mapa").setView(
        [19.2455, -103.7289],
        15
    );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                "&copy; OpenStreetMap"
        }
    ).addTo(mapa);

}


// ======================================================
// EVITAR INYECCIÓN DE HTML
// ======================================================

function escaparHTML(texto) {

    if (
        texto === null ||
        texto === undefined
    ) {

        return "";

    }


    return String(texto)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// ======================================================
// DETERMINAR ESTADO DE LA VACA
// ======================================================

function obtenerEstado(vaca) {

    if (!vaca.ubicacion) {

        return {

            clase: "sin-gps",

            texto: "SIN GPS"

        };

    }


    if (
        vaca.dentro_perimetro === true
    ) {

        return {

            clase: "dentro",

            texto: "DENTRO"

        };

    }


    if (
        vaca.dentro_perimetro === false
    ) {

        return {

            clase: "fuera",

            texto: "FUERA"

        };

    }


    return {

        clase: "sin-gps",

        texto: "SIN ESTADO"

    };

}


// ======================================================
// CREAR ICONO DEL MARCADOR
// ======================================================

function crearIcono(
    color,
    simbolo
) {

    return L.divIcon({

        className: "",


        html: `

            <div style="

                width:34px;

                height:34px;

                border-radius:50%;

                display:flex;

                align-items:center;

                justify-content:center;

                background:${color};

                color:white;

                border:3px solid white;

                box-shadow:
                    0 2px 8px
                    rgba(0,0,0,.35);

                font-size:16px;

                font-weight:bold;

            ">

                ${simbolo}

            </div>

        `,


        iconSize: [
            34,
            34
        ],


        iconAnchor: [
            17,
            17
        ],


        popupAnchor: [
            0,
            -18
        ]

    });

}


// ======================================================
// DIBUJAR RANCHO
// ======================================================

function dibujarRancho(rancho) {

    if (
        !rancho ||
        !rancho.ubicacion
    ) {

        return;

    }


    const anillo =
        rancho
            .ubicacion
            .coordinates[0]
            .map(
                punto => [
                    punto[1],
                    punto[0]
                ]
            );


    if (capaRancho) {

        capaRancho.remove();

    }


    capaRancho = L.polygon(

        anillo,

        {

            color: "#1976d2",

            weight: 3,

            fillColor: "#1976d2",

            fillOpacity: 0.12

        }

    ).addTo(mapa);


    mapa.fitBounds(
        capaRancho.getBounds(),
        {
            padding: [
                30,
                30
            ]
        }
    );


    document
        .getElementById(
            "estadoMapa"
        )
        .textContent =
        `${rancho.nombre} · ${rancho.puntos} puntos`;

}


// ======================================================
// ELIMINAR MARCADORES ANTERIORES
// ======================================================

function limpiarMarcadores() {

    for (
        const marcador
        of marcadores.values()
    ) {

        marcador.remove();

    }


    marcadores.clear();

}


// ======================================================
// DIBUJAR LAS VACAS
// ======================================================

function dibujarVacas(vacas) {

    limpiarMarcadores();


    const bounds = [];


    for (
        const vaca
        of vacas
    ) {


        if (
            !vaca.ubicacion ||
            !vaca.ubicacion.coordinates
        ) {

            continue;

        }


        const [
            lng,
            lat
        ] = vaca.ubicacion.coordinates;


        const estado =
            obtenerEstado(vaca);


        let color =
            "#757575";


        let simbolo =
            "🐄";


        if (
            estado.clase === "dentro"
        ) {

            color =
                "#2e7d32";

        }


        else if (
            estado.clase === "fuera"
        ) {

            color =
                "#d32f2f";

            simbolo =
                "⚠";

        }


        const marcador =
            L.marker(

                [
                    lat,
                    lng
                ],

                {

                    icon:
                        crearIcono(
                            color,
                            simbolo
                        )

                }

            ).addTo(mapa);


        const nombre =
            escaparHTML(
                vaca.nombre ||
                vaca.vaca_id
            );


        const collar =
            escaparHTML(
                vaca.collar_id ||
                "Sin collar"
            );


        const estadoTexto =
            escaparHTML(
                estado.texto
            );


        const popup = `

            <div class="popup-titulo">

                🐄 ${nombre}

            </div>


            <div class="popup-estado">

                <strong>
                    Estado:
                </strong>

                ${estadoTexto}

            </div>


            <div class="popup-estado">

                <strong>
                    Collar:
                </strong>

                ${collar}

            </div>


            <div class="popup-coordenadas">

                ${lat.toFixed(6)},
                ${lng.toFixed(6)}

            </div>

        `;


        marcador.bindPopup(
            popup
        );


        marcadores.set(
            vaca.vaca_id,
            marcador
        );


        bounds.push([
            lat,
            lng
        ]);

    }


    return bounds;

}


// ======================================================
// LISTA DE VACAS
// ======================================================

function renderizarListaVacas(
    vacas
) {

    const contenedor =
        document.getElementById(
            "listaVacas"
        );


    if (!vacas.length) {

        contenedor.innerHTML =
            '<div class="vacio">No hay vacas registradas.</div>';

        return;

    }


    contenedor.innerHTML =
        vacas.map(
            vaca => {

                const estado =
                    obtenerEstado(vaca);


                let claseEstado =
                    "estado-sin-gps";


                if (
                    estado.clase === "dentro"
                ) {

                    claseEstado =
                        "estado-dentro";

                }


                else if (
                    estado.clase === "fuera"
                ) {

                    claseEstado =
                        "estado-fuera";

                }


                const claseTarjeta =

                    estado.clase === "dentro"

                        ? "centro"

                        : estado.clase === "fuera"

                            ? "fuera"

                            : "sin-gps";


                let coords =
                    "Sin posición";


                if (
                    vaca.ubicacion &&
                    vaca.ubicacion.coordinates
                ) {

                    coords =
                        `${vaca.ubicacion.coordinates[1].toFixed(5)}, ${vaca.ubicacion.coordinates[0].toFixed(5)}`;

                }


                const timestamp =
                    vaca.timestamp

                        ? new Date(
                            vaca.timestamp
                        ).toLocaleString(
                            "es-MX"
                        )

                        : "Sin actualización";


                return `

                    <article
                        class="vaca-item ${claseTarjeta}"
                        data-vaca="${escaparHTML(vaca.vaca_id)}"
                    >


                        <div
                            class="vaca-cabecera"
                        >

                            <span
                                class="vaca-nombre"
                            >

                                🐄

                                ${
                                    escaparHTML(
                                        vaca.nombre ||
                                        vaca.vaca_id
                                    )
                                }

                            </span>


                            <span
                                class="vaca-estado ${claseEstado}"
                            >

                                ${
                                    estado.texto
                                }

                            </span>

                        </div>



                        <div
                            class="vaca-datos"
                        >

                            <span>

                                Collar:

                                ${
                                    escaparHTML(
                                        vaca.collar_id ||
                                        "-"
                                    )
                                }

                            </span>


                            <span>

                                ID:

                                ${
                                    escaparHTML(
                                        vaca.vaca_id
                                    )
                                }

                            </span>


                            <span>

                                GPS:

                                ${
                                    coords
                                }

                            </span>


                            <span>

                                Actualización:

                                ${
                                    escaparHTML(
                                        timestamp
                                    )
                                }

                            </span>

                        </div>


                    </article>

                `;

            }
        ).join("");


    contenedor
        .querySelectorAll(
            ".vaca-item"
        )
        .forEach(
            elemento => {

                elemento
                    .addEventListener(
                        "click",
                        () => {

                            const vacaId =
                                elemento.dataset.vaca;


                            const marcador =
                                marcadores.get(
                                    vacaId
                                );


                            if (marcador) {

                                mapa.setView(

                                    marcador.getLatLng(),

                                    Math.max(
                                        mapa.getZoom(),
                                        17
                                    )

                                );


                                marcador.openPopup();

                            }

                        }
                    );

            }
        );

}


// ======================================================
// LISTA DE ALERTAS
// ======================================================

function renderizarAlertas(
    alertas,
    vacas
) {

    const contenedor =
        document.getElementById(
            "listaAlertas"
        );


    const abiertas =
        alertas.filter(
            alerta =>
                alerta.atendida === false
        );


    document.getElementById(
        "totalAlertas"
    ).textContent =
        abiertas.length;


    if (!alertas.length) {

        contenedor.innerHTML =
            '<div class="vacio">No hay alertas registradas.</div>';

        return;

    }


    contenedor.innerHTML =
        alertas
            .slice(
                0,
                12
            )
            .map(
                alerta => {

                    const vaca =
                        vacas.find(
                            item =>
                                item.vaca_id ===
                                alerta.vaca_id
                        );


                    const nombre =
                        vaca
                            ? vaca.nombre
                            : alerta.vaca_id;


                    const fecha =
                        alerta.timestamp

                            ? new Date(
                                alerta.timestamp
                            ).toLocaleString(
                                "es-MX"
                            )

                            : "Sin fecha";


                    return `

                        <div
                            class="alerta-item"
                        >

                            <strong>

                                ⚠

                                ${
                                    escaparHTML(
                                        nombre
                                    )
                                }

                                — Fuera del perímetro

                            </strong>


                            <p>

                                ${
                                    escaparHTML(
                                        alerta.descripcion ||
                                        "La vaca salió del rancho."
                                    )
                                }

                            </p>


                            <small>

                                ${
                                    escaparHTML(
                                        fecha
                                    )
                                }

                            </small>

                        </div>

                    `;

                }
            )
            .join("");

}


// ======================================================
// CARGAR TODOS LOS DATOS
// ======================================================

async function cargarDatos() {

    try {

        const [
            vacasResp,
            ranchosResp,
            alertasResp
        ] = await Promise.all([

            fetch(
                "/api/vacas/ubicaciones"
            ),

            fetch(
                "/api/ranchos"
            ),

            fetch(
                "/api/alertas"
            )

        ]);


        if (
            !vacasResp.ok ||
            !ranchosResp.ok ||
            !alertasResp.ok
        ) {

            throw new Error(
                "Una de las APIs devolvió un error."
            );

        }


        const todasLasVacas =
            await vacasResp.json();


        const ranchos =
            await ranchosResp.json();


        const alertas =
            await alertasResp.json();


        // ==================================================
        // SOLO VACAS ACTIVAS
        // ==================================================

        const vacasActivas =
            todasLasVacas.filter(
                vaca =>
                    vaca.estado === "activa"
            );


        const rancho =
            ranchos.length
                ? ranchos[0]
                : null;


        // ==================================================
        // DIBUJAR RANCHO
        // ==================================================

        if (rancho) {

            dibujarRancho(
                rancho
            );

        }


        // ==================================================
        // DIBUJAR SOLO VACAS ACTIVAS
        // ==================================================

        dibujarVacas(
            vacasActivas
        );


        // ==================================================
        // LISTA DE VACAS
        // ==================================================

        renderizarListaVacas(
            vacasActivas
        );


        // ==================================================
        // ALERTAS
        // ==================================================

        renderizarAlertas(
            alertas,
            vacasActivas
        );


        // ==================================================
        // CONTADORES
        // ==================================================

        const total =
            vacasActivas.length;


        const dentro =
            vacasActivas.filter(
                vaca =>
                    vaca.dentro_perimetro === true
            ).length;


        const fuera =
            vacasActivas.filter(
                vaca =>
                    vaca.dentro_perimetro === false
            ).length;


        document.getElementById(
            "totalVacas"
        ).textContent =
            total;


        document.getElementById(
            "vacasDentro"
        ).textContent =
            dentro;


        document.getElementById(
            "vacasFuera"
        ).textContent =
            fuera;


        // ==================================================
        // HORA DE ACTUALIZACIÓN
        // ==================================================

        document.getElementById(
            "ultimaActualizacion"
        ).textContent =

            `Última actualización: ${
                new Date()
                    .toLocaleTimeString(
                        "es-MX"
                    )
            }`;


        // ==================================================
        // ESTADO DEL MAPA
        // ==================================================

        if (!rancho) {

            document.getElementById(
                "estadoMapa"
            ).textContent =
                "No hay un rancho activo guardado.";

        }

    }


    catch (error) {

        console.error(
            error
        );


        document.getElementById(
            "estadoMapa"
        ).textContent =
            "Error cargando el monitoreo.";


        document.getElementById(
            "listaVacas"
        ).innerHTML =

            `<div class="vacio">

                ${escaparHTML(
                    error.message
                )}

            </div>`;

    }

}


// ======================================================
// INICIAR
// ======================================================

async function iniciar() {

    crearMapa();


    await cargarDatos();


    intervalo =
        setInterval(
            cargarDatos,
            10000
        );

}


// ======================================================
// BOTÓN ACTUALIZAR
// ======================================================

document
    .getElementById(
        "btnActualizar"
    )
    .addEventListener(
        "click",
        cargarDatos
    );


// ======================================================
// ARRANCAR
// ======================================================

iniciar();