let mapa;

let dibujando = false;

let puntos = [];

let linea = null;

let poligono = null;


// ---------------------------------------------------------
// INICIALIZAR MAPA
// ---------------------------------------------------------

mapa = L.map("mapa").setView([19.2431, -103.7245], 15);


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
    }
).addTo(mapa);


// ---------------------------------------------------------
// ELEMENTOS HTML
// ---------------------------------------------------------

const btnDibujar = document.getElementById("btnDibujar");
const btnCerrar = document.getElementById("btnCerrar");
const btnLimpiar = document.getElementById("btnLimpiar");

const estado = document.getElementById("estado");
const contadorPuntos = document.getElementById("contadorPuntos");

const mensaje = document.getElementById("mensaje");


// ---------------------------------------------------------
// BOTÓN DIBUJAR
// ---------------------------------------------------------

btnDibujar.addEventListener("click", function () {

    dibujando = true;

    puntos = [];

    contadorPuntos.textContent = "0";

    estado.textContent =
        "Modo dibujo activado. Haz clic alrededor del perímetro del rancho.";

    limpiarVisual();

});


// ---------------------------------------------------------
// CLIC EN EL MAPA
// ---------------------------------------------------------

mapa.on("click", function (evento) {

    if (!dibujando) {
        return;
    }


    const latitud = evento.latlng.lat;
    const longitud = evento.latlng.lng;


    puntos.push([longitud, latitud]);


    contadorPuntos.textContent = puntos.length;


    actualizarLinea();


    estado.textContent =
        `Punto ${puntos.length} agregado. Sigue marcando el perímetro.`;

});


// ---------------------------------------------------------
// DIBUJAR LÍNEA
// ---------------------------------------------------------

function actualizarLinea() {

    const coordenadas = puntos.map(function (punto) {

        return [punto[1], punto[0]];

    });


    if (linea) {

        linea.setLatLngs(coordenadas);

    } else {

        linea = L.polyline(
            coordenadas,
            {
                color: "#2e7d32",
                weight: 4
            }
        ).addTo(mapa);

    }

}


// ---------------------------------------------------------
// CERRAR Y GUARDAR
// ---------------------------------------------------------

btnCerrar.addEventListener("click", async function () {

    if (puntos.length < 3) {

        mostrarMensaje(
            "Necesitas marcar al menos 3 puntos para formar el rancho."
        );

        return;
    }


    const nombre =
        document.getElementById("nombreRancho").value.trim()
        || "Rancho principal";


    dibujando = false;


    const coordenadasPoligono = puntos.map(function (punto) {

        return [punto[1], punto[0]];

    });


    // Cerramos visualmente el polígono
    coordenadasPoligono.push(coordenadasPoligono[0]);


    if (poligono) {

        poligono.remove();

    }


    poligono = L.polygon(
        coordenadasPoligono,
        {
            color: "#1976d2",
            weight: 4,
            fillColor: "#1976d2",
            fillOpacity: 0.20
        }
    ).addTo(mapa);


    if (linea) {

        linea.remove();
        linea = null;

    }


    estado.textContent =
        "Guardando rancho en MongoDB...";


    try {

        const respuesta = await fetch("/api/ranchos", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                nombre: nombre,

                puntos: puntos

            })

        });


        const datos = await respuesta.json();


        if (!respuesta.ok) {

            throw new Error(
                datos.error || "No se pudo guardar el rancho."
            );

        }


        estado.textContent =
            "Rancho guardado correctamente.";


        mostrarMensaje(
            `Rancho guardado correctamente. ID: ${datos.rancho_id}`
        );


    } catch (error) {

        console.error(error);


        estado.textContent =
            "Ocurrió un error al guardar.";


        mostrarMensaje(
            "No se pudo guardar el rancho. Revisa que Flask y MongoDB estén funcionando."
        );

    }

});


// ---------------------------------------------------------
// LIMPIAR
// ---------------------------------------------------------

btnLimpiar.addEventListener("click", function () {

    dibujando = false;

    puntos = [];

    contadorPuntos.textContent = "0";

    limpiarVisual();


    estado.textContent =
        'Presiona "Dibujar rancho" para comenzar.';

});


// ---------------------------------------------------------
// LIMPIAR ELEMENTOS VISUALES
// ---------------------------------------------------------

function limpiarVisual() {

    if (linea) {

        linea.remove();

        linea = null;

    }


    if (poligono) {

        poligono.remove();

        poligono = null;

    }

}


// ---------------------------------------------------------
// MENSAJE
// ---------------------------------------------------------

function mostrarMensaje(texto) {

    mensaje.textContent = texto;

    mensaje.style.display = "block";


    setTimeout(function () {

        mensaje.style.display = "none";

    }, 5000);

}


// ---------------------------------------------------------
// CARGAR RANCHO GUARDADO
// ---------------------------------------------------------

async function cargarRanchoGuardado() {

    try {

        const respuesta =
            await fetch("/api/ranchos");


        if (!respuesta.ok) {

            return;

        }


        const ranchos =
            await respuesta.json();


        if (!ranchos.length) {

            return;

        }


        const rancho =
            ranchos[ranchos.length - 1];


        const coordenadas =
            rancho.ubicacion.coordinates[0].map(
                function (punto) {

                    return [punto[1], punto[0]];

                }
            );


        poligono = L.polygon(

            coordenadas,

            {
                color: "#1976d2",
                weight: 4,
                fillColor: "#1976d2",
                fillOpacity: 0.20
            }

        ).addTo(mapa);


        mapa.fitBounds(
            poligono.getBounds()
        );


        estado.textContent =
            `Rancho cargado: ${rancho.nombre}`;

        contadorPuntos.textContent =
            rancho.puntos;


    } catch (error) {

        console.error(
            "Error cargando rancho:",
            error
        );

    }

}


// ---------------------------------------------------------
// CARGAR AL INICIAR
// ---------------------------------------------------------

cargarRanchoGuardado();