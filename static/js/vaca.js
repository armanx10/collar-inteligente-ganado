// ==========================================
// OBTENER ID DESDE LA URL
// ==========================================

const partesURL =
    window.location.pathname.split("/");

const vacaId =
    decodeURIComponent(
        partesURL[
            partesURL.length - 1
        ]
    );


// ==========================================
// VARIABLES
// ==========================================

let map = null;

let temperaturaChart = null;

let cardiacaChart = null;

let respiratoriaChart = null;

let bateriaChart = null;

let pesoChart = null;


// ==========================================
// UTILIDADES
// ==========================================

function escaparHTML(texto) {

    const div =
        document.createElement("div");

    div.textContent =
        texto ?? "";

    return div.innerHTML;
}


function numero(
    valor,
    decimales = 1
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "--";
    }

    return Number(valor).toFixed(
        decimales
    );
}


function fechaTexto(fecha) {

    if (!fecha) {
        return "--";
    }

    return new Date(fecha).toLocaleString(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function horaTexto(fecha) {

    if (!fecha) {
        return "--";
    }

    return new Date(fecha).toLocaleTimeString(
        "es-MX",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// ==========================================
// CARGAR RESUMEN
// ==========================================

async function cargarResumen() {

    const respuesta =
        await fetch(
            `/api/vacas/${encodeURIComponent(vacaId)}/resumen`
        );

    if (!respuesta.ok) {

        throw new Error(
            "No se pudo cargar el resumen"
        );
    }

    return await respuesta.json();
}


// ==========================================
// CARGAR MEDICIONES
// ==========================================

async function cargarMediciones() {

    const respuesta =
        await fetch(
            `/api/vacas/${encodeURIComponent(vacaId)}/mediciones`
        );

    if (!respuesta.ok) {

        throw new Error(
            "No se pudieron cargar las mediciones"
        );
    }

    const datos =
        await respuesta.json();

    return datos.reverse();
}


// ==========================================
// CARGAR PESAJE
// ==========================================

async function cargarPesajes() {

    const respuesta =
        await fetch(
            `/api/vacas/${encodeURIComponent(vacaId)}/pesajes`
        );

    if (!respuesta.ok) {

        throw new Error(
            "No se pudieron cargar los pesajes"
        );
    }

    return await respuesta.json();
}


// ==========================================
// MOSTRAR DATOS DE LA VACA
// ==========================================

function mostrarDatos(
    resumen
) {

    const vaca =
        resumen.vaca;

    const medicion =
        resumen.ultima_medicion;


    document.title =
        `${vaca.nombre} | Ganado Inteligente`;


    document.getElementById(
        "vaca-nombre"
    ).textContent =
        vaca.nombre;


    document.getElementById(
        "vaca-identificacion"
    ).textContent =
        `${vaca.raza} · ${vaca.sexo} · Collar ${vaca.collar_id}`;


    document.getElementById(
        "vaca-raza"
    ).textContent =
        vaca.raza;


    document.getElementById(
        "vaca-sexo"
    ).textContent =
        vaca.sexo;


    document.getElementById(
        "vaca-edad"
    ).textContent =
        `${vaca.edad} año(s)`;


    document.getElementById(
        "vaca-peso"
    ).textContent =
        `${numero(vaca.peso, 0)} kg`;


    document.getElementById(
        "vaca-collar"
    ).textContent =
        vaca.collar_id;


    document.getElementById(
        "vaca-id"
    ).textContent =
        vaca.vaca_id;


    const estado =
        document.getElementById(
            "vaca-estado"
        );


    if (vaca.estado === "activa") {

        estado.textContent =
            "ACTIVA";

    } else {

        estado.textContent =
            "INACTIVA";

    }


    if (medicion) {

        document.getElementById(
            "current-temperature"
        ).textContent =
            `${numero(
                medicion.temperatura,
                1
            )} °C`;


        document.getElementById(
            "current-cardiaca"
        ).textContent =
            `${numero(
                medicion.frecuencia_cardiaca,
                0
            )} BPM`;


        document.getElementById(
            "current-respiratoria"
        ).textContent =
            `${numero(
                medicion.frecuencia_respiratoria,
                0
            )} RPM`;


        document.getElementById(
            "current-bateria"
        ).textContent =
            `${numero(
                medicion.voltaje_bateria,
                2
            )} V`;


        document.getElementById(
            "ultima-medicion"
        ).textContent =
            `Última lectura: ${fechaTexto(
                medicion.timestamp
            )}`;

    }

}


// ==========================================
// CREAR GRÁFICA
// ==========================================

function crearGrafica(
    canvasId,
    labels,
    valores,
    titulo,
    unidad
) {

    const canvas =
        document.getElementById(
            canvasId
        );


    return new Chart(
        canvas,
        {
            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: titulo,

                        data: valores,

                        borderWidth: 2,

                        tension: 0.35,

                        pointRadius: 2,

                        pointHoverRadius: 5,

                        fill: true
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                interaction: {

                    mode: "index",

                    intersect: false
                },

                plugins: {

                    legend: {

                        display: false

                    }

                },

                scales: {

                    x: {

                        grid: {

                            display: false

                        }

                    },

                    y: {

                        beginAtZero: false,

                        title: {

                            display: true,

                            text: unidad

                        }

                    }

                }

            }
        }
    );
}


// ==========================================
// MOSTRAR GRÁFICAS
// ==========================================

function mostrarGraficas(
    mediciones,
    pesajes
) {

    const ultimas =
        mediciones.slice(-30);


    const labels =
        ultimas.map(
            medicion =>
                horaTexto(
                    medicion.timestamp
                )
        );


    const temperaturas =
        ultimas.map(
            medicion =>
                medicion.temperatura
        );


    const cardiacas =
        ultimas.map(
            medicion =>
                medicion.frecuencia_cardiaca
        );


    const respiratorias =
        ultimas.map(
            medicion =>
                medicion.frecuencia_respiratoria
        );


    const baterias =
        ultimas.map(
            medicion =>
                medicion.voltaje_bateria
        );


    temperaturaChart =
        crearGrafica(
            "temperatura-chart",
            labels,
            temperaturas,
            "Temperatura",
            "°C"
        );


    cardiacaChart =
        crearGrafica(
            "cardiaca-chart",
            labels,
            cardiacas,
            "Frecuencia cardiaca",
            "BPM"
        );


    respiratoriaChart =
        crearGrafica(
            "respiratoria-chart",
            labels,
            respiratorias,
            "Frecuencia respiratoria",
            "RPM"
        );


    bateriaChart =
        crearGrafica(
            "bateria-chart",
            labels,
            baterias,
            "Voltaje",
            "V"
        );


    const pesoLabels =
        pesajes.map(
            pesaje =>
                new Date(
                    pesaje.fecha
                ).toLocaleDateString(
                    "es-MX"
                )
        );


    const pesos =
        pesajes.map(
            pesaje =>
                pesaje.peso
        );


    pesoChart =
        crearGrafica(
            "peso-chart",
            pesoLabels,
            pesos,
            "Peso",
            "kg"
        );
}


// ==========================================
// MAPA
// ==========================================

function mostrarMapa(
    medicion
) {

    if (
        !medicion ||
        !medicion.ubicacion
    ) {

        return;
    }


    const coordenadas =
        medicion.ubicacion.coordinates;


    const longitud =
        coordenadas[0];


    const latitud =
        coordenadas[1];


    map =
        L.map(
            "animal-map"
        ).setView(
            [
                latitud,
                longitud
            ],
            17
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);


    const marker =
        L.marker(
            [
                latitud,
                longitud
            ]
        ).addTo(map);


    marker.bindPopup(
        `<strong>${escaparHTML(
            document.getElementById(
                "vaca-nombre"
            ).textContent
        )}</strong>`
    ).openPopup();

}


// ==========================================
// MOSTRAR ALERTAS
// ==========================================

function mostrarAlertas(
    alertas
) {

    const contenedor =
        document.getElementById(
            "animal-alerts"
        );


    if (
        !alertas ||
        !alertas.length
    ) {

        contenedor.innerHTML = `
            <div class="no-alerts">
                ✓ No hay alertas pendientes
                para este animal.
            </div>
        `;

        return;
    }


    contenedor.innerHTML =
        alertas
            .map(
                alerta => `

                <article
                    class="animal-alert"
                >

                    <div
                        class="animal-alert-title"
                    >
                        ${escaparHTML(
                            alerta.tipo
                        )}
                    </div>

                    <div
                        class="animal-alert-description"
                    >
                        ${escaparHTML(
                            alerta.descripcion
                        )}
                    </div>

                    <div
                        class="animal-alert-value"
                    >
                        Valor:
                        ${numero(
                            alerta.valor,
                            2
                        )}
                    </div>

                </article>
            `
            )
            .join("");
}


// ==========================================
// INICIALIZAR
// ==========================================

async function inicializar() {

    try {

        const [
            resumen,
            mediciones,
            pesajes
        ] = await Promise.all(
            [
                cargarResumen(),
                cargarMediciones(),
                cargarPesajes()
            ]
        );


        mostrarDatos(
            resumen
        );


        mostrarGraficas(
            mediciones,
            pesajes
        );


        mostrarMapa(
            resumen.ultima_medicion
        );


        mostrarAlertas(
            resumen.alertas
        );


    } catch (error) {

        console.error(
            "Error:",
            error
        );


        document.getElementById(
            "vaca-nombre"
        ).textContent =
            "No se pudo cargar la información";


        document.getElementById(
            "vaca-identificacion"
        ).textContent =
            "Verifica que Flask y MongoDB estén funcionando.";

    }

}


// ==========================================
// EJECUTAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    inicializar
);