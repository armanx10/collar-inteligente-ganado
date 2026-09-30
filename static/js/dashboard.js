// ==========================================
// CONFIGURACIÓN
// ==========================================

const REFRESH_INTERVAL = 10000;

const DEFAULT_LAT = 19.0000;
const DEFAULT_LNG = -103.0000;


// ==========================================
// VARIABLES
// ==========================================

let map = null;

let markerLayer = null;

let temperaturaChart = null;

let cardiacaChart = null;

let respiratoriaChart = null;

let bateriaChart = null;

let pesoChart = null;

let vacasActuales = [];


// ==========================================
// INICIALIZAR MAPA
// ==========================================

function inicializarMapa() {

    if (map !== null) {
        return;
    }


    map = L.map("map")
        .setView(
            [
                DEFAULT_LAT,
                DEFAULT_LNG
            ],
            15
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);


    markerLayer =
        L.layerGroup()
            .addTo(map);
}


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


function formatearNumero(
    valor,
    decimales = 1
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return "--";
    }


    return Number(valor)
        .toFixed(decimales);
}


function formatearFecha(fecha) {

    if (!fecha) {
        return "Sin fecha";
    }


    const date =
        new Date(fecha);


    return date.toLocaleString(
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


function formatearHora(fecha) {

    if (!fecha) {
        return "--";
    }


    const date =
        new Date(fecha);


    return date.toLocaleTimeString(
        "es-MX",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// ==========================================
// API - VACAS
// ==========================================

async function cargarVacas() {

    try {

        const respuesta =
            await fetch(
                "/api/vacas"
            );


        if (!respuesta.ok) {

            throw new Error(
                "No se pudieron obtener las vacas"
            );
        }


        return await respuesta.json();

    } catch (error) {

        console.error(
            "Error cargando vacas:",
            error
        );

        return [];
    }
}


// ==========================================
// API - RESUMEN
// ==========================================

async function cargarResumenVaca(
    vacaId
) {

    try {

        const respuesta =
            await fetch(
                `/api/vacas/${encodeURIComponent(vacaId)}/resumen`
            );


        if (!respuesta.ok) {

            throw new Error(
                "No se pudo obtener el resumen"
            );
        }


        return await respuesta.json();

    } catch (error) {

        console.error(
            `Error cargando ${vacaId}:`,
            error
        );

        return null;
    }
}


// ==========================================
// API - MEDICIONES
// ==========================================

async function cargarMediciones(
    vacaId
) {

    try {

        const respuesta =
            await fetch(
                `/api/vacas/${encodeURIComponent(vacaId)}/mediciones`
            );


        if (!respuesta.ok) {

            throw new Error(
                "No se pudieron obtener las mediciones"
            );
        }


        const mediciones =
            await respuesta.json();


        return mediciones.reverse();

    } catch (error) {

        console.error(
            "Error cargando mediciones:",
            error
        );

        return [];
    }
}


// ==========================================
// API - PESAJE
// ==========================================

async function cargarPesajes(
    vacaId
) {

    try {

        const respuesta =
            await fetch(
                `/api/vacas/${encodeURIComponent(vacaId)}/pesajes`
            );


        if (!respuesta.ok) {

            throw new Error(
                "No se pudieron obtener los pesajes"
            );
        }


        return await respuesta.json();

    } catch (error) {

        console.error(
            "Error cargando pesajes:",
            error
        );

        return [];
    }
}


// ==========================================
// API - ALERTAS
// ==========================================

async function cargarAlertas() {

    try {

        const respuesta =
            await fetch(
                "/api/alertas"
            );


        if (!respuesta.ok) {

            throw new Error(
                "No se pudieron obtener las alertas"
            );
        }


        return await respuesta.json();

    } catch (error) {

        console.error(
            "Error cargando alertas:",
            error
        );

        return [];
    }
}


// ==========================================
// TARJETAS DE VACAS
// ==========================================

function crearTarjetaVaca(
    resumen
) {

    if (!resumen) {
        return "";
    }


    const vaca =
        resumen.vaca;


    const medicion =
        resumen.ultima_medicion;


    if (!medicion) {

        return `
            <article
                class="cattle-card cattle-clickable"
                data-vaca-id="${escaparHTML(vaca.vaca_id)}"
            >

                <div class="cattle-card-header">

                    <div>

                        <div class="cattle-name">
                            ${escaparHTML(vaca.nombre)}
                        </div>

                        <div class="cattle-info">

                            ${escaparHTML(vaca.raza)}
                            ·
                            ${escaparHTML(vaca.sexo)}
                            ·
                            ${vaca.edad} año(s)

                        </div>

                    </div>

                    <div class="cattle-footer">

                    <span>

                        Peso:
                        ${formatearNumero(
                            vaca.peso,
                            0
                    )}
                     kg

                </span>

                <a
                    href="/vaca/${encodeURIComponent(vaca.vaca_id)}"
                    class="cattle-detail-button"
                >
                    Ver detalle →
                </a>

</div>

            </article>
        `;
    }


    const alertas =
        resumen.alertas || [];


    const tieneAlertas =
        alertas.length > 0;


    const estadoClase =
        tieneAlertas
            ? "warning"
            : "";


    const estadoTexto =
        tieneAlertas
            ? "ATENCIÓN"
            : "ACTIVA";


    return `
        <article
            class="cattle-card cattle-clickable"
            data-vaca-id="${escaparHTML(vaca.vaca_id)}"
        >

            <div class="cattle-card-header">

                <div>

                    <div class="cattle-name">
                        ${escaparHTML(vaca.nombre)}
                    </div>

                    <div class="cattle-info">

                        ${escaparHTML(vaca.raza)}
                        ·
                        ${escaparHTML(vaca.sexo)}
                        ·
                        ${vaca.edad} año(s)

                    </div>

                </div>

                <span
                    class="cattle-status ${estadoClase}"
                >
                    ${estadoTexto}
                </span>

            </div>


            <div class="cattle-metrics">

                <div class="metric">

                    <span class="metric-label">
                        TEMPERATURA
                    </span>

                    <span class="metric-value">

                        ${formatearNumero(
                            medicion.temperatura,
                            1
                        )}
                        °C

                    </span>

                </div>


                <div class="metric">

                    <span class="metric-label">
                        FRECUENCIA CARDIACA
                    </span>

                    <span class="metric-value">

                        ${formatearNumero(
                            medicion.frecuencia_cardiaca,
                            0
                        )}
                        BPM

                    </span>

                </div>


                <div class="metric">

                    <span class="metric-label">
                        FRECUENCIA RESPIRATORIA
                    </span>

                    <span class="metric-value">

                        ${formatearNumero(
                            medicion.frecuencia_respiratoria,
                            0
                        )}
                        RPM

                    </span>

                </div>


                <div class="metric">

                    <span class="metric-label">
                        BATERÍA
                    </span>

                    <span class="metric-value">

                        ${formatearNumero(
                            medicion.voltaje_bateria,
                            2
                        )}
                        V

                    </span>

                </div>

            </div>


            <div class="cattle-footer">

                <span>

                    Peso:
                    ${formatearNumero(
                        vaca.peso,
                        0
        )}
        kg

    </span>

    <a
        href="/vaca/${encodeURIComponent(vaca.vaca_id)}"
        class="cattle-detail-button"
    >
        Ver detalle →
    </a>

</div>

        </article>
    `;
}


// ==========================================
// RENDERIZAR VACAS
// ==========================================

async function renderizarVacas(
    vacas
) {

    const contenedor =
        document.getElementById(
            "cattle-grid"
        );


    if (!vacas.length) {

        contenedor.innerHTML = `
            <div class="loading-card">

                <p>
                    No hay vacas registradas.
                </p>

            </div>
        `;

        return [];
    }


    const promesas =
        vacas.map(
            vaca =>
                cargarResumenVaca(
                    vaca.vaca_id
                )
        );


    const resultados =
        await Promise.all(
            promesas
        );


    const tarjetas =
        resultados
            .map(
                resumen =>
                    crearTarjetaVaca(
                        resumen
                    )
            )
            .join("");


    contenedor.innerHTML =
        tarjetas;


    return resultados;
}


// ==========================================
// MAPA
// ==========================================

function actualizarMapa(
    resultados
) {

    if (
        !map ||
        !markerLayer
    ) {

        return;
    }


    markerLayer.clearLayers();


    const posiciones = [];


    resultados.forEach(
        resumen => {

            if (!resumen) {
                return;
            }


            const vaca =
                resumen.vaca;


            const medicion =
                resumen.ultima_medicion;


            if (
                !medicion ||
                !medicion.ubicacion ||
                !medicion.ubicacion.coordinates
            ) {

                return;
            }


            const coordinates =
                medicion.ubicacion.coordinates;


            const longitud =
                coordinates[0];


            const latitud =
                coordinates[1];


            if (
                typeof latitud !== "number" ||
                typeof longitud !== "number"
            ) {

                return;
            }


            posiciones.push(
                [
                    latitud,
                    longitud
                ]
            );


            const marker =
                L.marker(
                    [
                        latitud,
                        longitud
                    ]
                );


            marker
                .bindPopup(
                    `

                    <div
                        style="
                            min-width: 190px;
                            font-family: Arial, sans-serif;
                        "
                    >

                        <strong
                            style="
                                color: #173a28;
                                font-size: 16px;
                            "
                        >

                            ${escaparHTML(
                                vaca.nombre
                            )}

                        </strong>

                        <br>

                        ID:
                        ${escaparHTML(
                            vaca.vaca_id
                        )}

                        <hr>

                        🌡️
                        ${formatearNumero(
                            medicion.temperatura,
                            1
                        )}
                        °C

                        <br>

                        ❤️
                        ${formatearNumero(
                            medicion.frecuencia_cardiaca,
                            0
                        )}
                        BPM

                        <br>

                        🫁
                        ${formatearNumero(
                            medicion.frecuencia_respiratoria,
                            0
                        )}
                        RPM

                        <br>

                        🔋
                        ${formatearNumero(
                            medicion.voltaje_bateria,
                            2
                        )}
                        V

                    </div>

                    `
                )
                .addTo(markerLayer);

        }
    );


    if (
        posiciones.length > 0
    ) {

        const bounds =
            L.latLngBounds(
                posiciones
            );


        map.fitBounds(
            bounds,
            {
                padding: [
                    30,
                    30
                ],
                maxZoom: 16
            }
        );
    }
}


// ==========================================
// ALERTAS
// ==========================================

function renderizarAlertas(
    alertas
) {

    const contenedor =
        document.getElementById(
            "alerts-container"
        );


    const pendientes =
        alertas.filter(
            alerta =>
                alerta.atendida === false
        );


    document.getElementById(
        "total-alertas"
    ).textContent =
        pendientes.length;


    if (
        !pendientes.length
    ) {

        contenedor.innerHTML = `
            <div class="empty-alerts">

                <span>
                    ✓
                </span>

                <p>
                    No hay alertas pendientes.
                </p>

            </div>
        `;

        return;
    }


    contenedor.innerHTML =
        pendientes
            .slice(
                0,
                8
            )
            .map(
                alerta => `

                    <article
                        class="alert-card"
                    >

                        <div
                            class="alert-main"
                        >

                            <div
                                class="alert-icon"
                            >
                                ⚠
                            </div>

                            <div>

                                <div
                                    class="alert-title"
                                >

                                    Vaca
                                    ${escaparHTML(
                                        alerta.vaca_id
                                    )}

                                </div>

                                <div
                                    class="alert-description"
                                >

                                    ${escaparHTML(
                                        alerta.descripcion
                                    )}

                                </div>

                            </div>

                        </div>


                        <div
                            class="alert-value"
                        >

                            ${escaparHTML(
                                alerta.tipo
                            )}

                            <br>

                            ${formatearNumero(
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
// SELECTOR DE VACAS
// ==========================================

function llenarSelectorVacas(
    vacas
) {

    const selector =
        document.getElementById(
            "vaca-selector"
        );


    if (!selector) {
        return;
    }


    const valorActual =
        selector.value;


    selector.innerHTML = `
        <option value="">
            Selecciona una vaca
        </option>
    `;


    vacas.forEach(
        vaca => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                vaca.vaca_id;


            option.textContent =
                `${vaca.nombre} — ${vaca.vaca_id}`;


            selector.appendChild(
                option
            );

        }
    );


    if (
        valorActual &&
        vacas.some(
            vaca =>
                vaca.vaca_id === valorActual
        )
    ) {

        selector.value =
            valorActual;
    }
}


// ==========================================
// CREAR GRÁFICAS
// ==========================================

function destruirGraficas() {

    if (temperaturaChart) {
        temperaturaChart.destroy();
        temperaturaChart = null;
    }


    if (cardiacaChart) {
        cardiacaChart.destroy();
        cardiacaChart = null;
    }


    if (respiratoriaChart) {
        respiratoriaChart.destroy();
        respiratoriaChart = null;
    }


    if (bateriaChart) {
        bateriaChart.destroy();
        bateriaChart = null;
    }


    if (pesoChart) {
        pesoChart.destroy();
        pesoChart = null;
    }
}


function crearGraficaLinea(
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


    if (!canvas) {
        return null;
    }


    return new Chart(
        canvas,
        {
            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {

                        label:
                            titulo,

                        data:
                            valores,

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

                            text:
                                unidad

                        }

                    }

                }

            }
        }
    );
}


// ==========================================
// ACTUALIZAR GRÁFICAS
// ==========================================

async function actualizarGraficas(
    vacaId
) {

    const chartsContainer =
        document.getElementById(
            "charts-container"
        );


    const chartsMessage =
        document.getElementById(
            "charts-message"
        );


    if (!vacaId) {

        destruirGraficas();

        chartsContainer.classList.add(
            "hidden"
        );

        chartsMessage.classList.remove(
            "hidden"
        );

        chartsMessage.textContent =
            "Selecciona una vaca para visualizar sus mediciones.";

        return;
    }


    chartsMessage.textContent =
        "Cargando mediciones...";


    chartsMessage.classList.remove(
        "hidden"
    );

    chartsContainer.classList.add(
        "hidden"
    );


    const [
        mediciones,
        pesajes
    ] = await Promise.all(
        [
            cargarMediciones(vacaId),
            cargarPesajes(vacaId)
        ]
    );


    if (
        !mediciones.length &&
        !pesajes.length
    ) {

        chartsMessage.textContent =
            "Esta vaca todavía no tiene suficientes datos para mostrar gráficas.";

        return;
    }


    const ultimasMediciones =
        mediciones.slice(-30);


    const labels =
        ultimasMediciones.map(
            medicion =>
                formatearHora(
                    medicion.timestamp
                )
        );


    const temperatura =
        ultimasMediciones.map(
            medicion =>
                medicion.temperatura
        );


    const cardiaca =
        ultimasMediciones.map(
            medicion =>
                medicion.frecuencia_cardiaca
        );


    const respiratoria =
        ultimasMediciones.map(
            medicion =>
                medicion.frecuencia_respiratoria
        );


    const bateria =
        ultimasMediciones.map(
            medicion =>
                medicion.voltaje_bateria
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


    destruirGraficas();


    temperaturaChart =
        crearGraficaLinea(
            "temperatura-chart",
            labels,
            temperatura,
            "Temperatura",
            "°C"
        );


    cardiacaChart =
        crearGraficaLinea(
            "cardiaca-chart",
            labels,
            cardiaca,
            "Frecuencia cardiaca",
            "BPM"
        );


    respiratoriaChart =
        crearGraficaLinea(
            "respiratoria-chart",
            labels,
            respiratoria,
            "Frecuencia respiratoria",
            "RPM"
        );


    bateriaChart =
        crearGraficaLinea(
            "bateria-chart",
            labels,
            bateria,
            "Batería",
            "Voltios"
        );


    pesoChart =
        crearGraficaLinea(
            "peso-chart",
            pesoLabels,
            pesos,
            "Peso",
            "kg"
        );


    chartsMessage.classList.add(
        "hidden"
    );


    chartsContainer.classList.remove(
        "hidden"
    );
}


// ==========================================
// ACTUALIZAR DASHBOARD
// ==========================================

async function actualizarDashboard() {

    const [
        vacas,
        alertas
    ] = await Promise.all(
        [
            cargarVacas(),
            cargarAlertas()
        ]
    );


    vacasActuales =
        vacas;


    const activas =
        vacas.filter(
            vaca =>
                vaca.estado === "activa"
        );


    document.getElementById(
        "total-vacas"
    ).textContent =
        vacas.length;


    document.getElementById(
        "vacas-activas"
    ).textContent =
        activas.length;


    llenarSelectorVacas(
        vacas
    );


    const resultados =
        await renderizarVacas(
            vacas
        );


    actualizarMapa(
        resultados
    );


    renderizarAlertas(
        alertas
    );


    const ultimaActualizacion =
        document.getElementById(
            "ultima-actualizacion"
        );


    if (ultimaActualizacion) {

        ultimaActualizacion.textContent =
            `Actualizado: ${new Date().toLocaleTimeString(
                "es-MX"
            )}`;
    }


    const selector =
        document.getElementById(
            "vaca-selector"
        );


    if (
        selector &&
        selector.value
    ) {

        await actualizarGraficas(
            selector.value
        );
    }
}


// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        inicializarMapa();


        const selector =
            document.getElementById(
                "vaca-selector"
            );


        if (selector) {

            selector.addEventListener(
                "change",
                async function () {

                    await actualizarGraficas(
                        this.value
                    );

                }
            );
        }


        await actualizarDashboard();


        setInterval(
            actualizarDashboard,
            REFRESH_INTERVAL
        );

    }
);