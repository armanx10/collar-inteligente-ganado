const form =
    document.getElementById(
        "formVaca"
    );

const btnLimpiar =
    document.getElementById(
        "btnLimpiar"
    );

const btnGuardar =
    document.getElementById(
        "btnGuardar"
    );

const mensaje =
    document.getElementById(
        "mensaje"
    );

const tabla =
    document.getElementById(
        "tablaVacas"
    );

const contador =
    document.getElementById(
        "contador"
    );


// ======================================================
// ESCAPAR HTML
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
// MOSTRAR MENSAJE
// ======================================================

function mostrarMensaje(
    texto,
    tipo
) {

    mensaje.textContent =
        texto;

    mensaje.className =
        `mensaje ${tipo}`;

}


// ======================================================
// LIMPIAR MENSAJE
// ======================================================

function ocultarMensaje() {

    mensaje.textContent =
        "";

    mensaje.className =
        "mensaje";

}


// ======================================================
// CARGAR VACAS
// ======================================================

async function cargarVacas() {

    try {

        const respuesta =
            await fetch(
                "/api/vacas"
            );


        if (
            !respuesta.ok
        ) {

            throw new Error(
                "No se pudieron obtener las vacas."
            );

        }


        const vacas =
            await respuesta.json();


        renderizarVacas(
            vacas
        );


    } catch (error) {

        console.error(
            error
        );


        tabla.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="cargando"
                >

                    ${escaparHTML(
                        error.message
                    )}

                </td>

            </tr>

        `;

    }

}


// ======================================================
// RENDERIZAR TABLA
// ======================================================

function renderizarVacas(vacas) {

    contador.textContent =
        `${vacas.length} ${
            vacas.length === 1
                ? "vaca"
                : "vacas"
        }`;


    if (vacas.length === 0) {

        tabla.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="cargando"
                >

                    No hay vacas registradas todavía.

                </td>

            </tr>

        `;

        return;

    }


    tabla.innerHTML =
        vacas.map(
            vaca => {

                const edad =
                    vaca.edad !== undefined &&
                    vaca.edad !== null

                        ? `${vaca.edad} años`

                        : "—";


                const peso =
                    vaca.peso !== undefined &&
                    vaca.peso !== null

                        ? `${vaca.peso} kg`

                        : "—";


                const estado =
                    vaca.estado ||
                    "activa";


                const esActiva =
                    estado === "activa";


                const botonTexto =
                    esActiva
                        ? "Dar de baja"
                        : "Reactivar";


                const claseBoton =
                    esActiva
                        ? "boton-baja"
                        : "boton-reactivar";


                return `

                    <tr>

                        <td>

                            <span
                                class="id-vaca"
                            >

                                ${escaparHTML(
                                    vaca.vaca_id
                                )}

                            </span>

                        </td>


                        <td>

                            <strong>

                                ${escaparHTML(
                                    vaca.nombre
                                )}

                            </strong>

                        </td>


                        <td>

                            ${escaparHTML(
                                vaca.raza ||
                                "—"
                            )}

                        </td>


                        <td>

                            ${escaparHTML(
                                vaca.sexo ||
                                "—"
                            )}

                        </td>


                        <td>

                            ${edad}

                        </td>


                        <td>

                            ${peso}

                        </td>


                        <td>

                            <span
                                class="id-vaca"
                            >

                                ${escaparHTML(
                                    vaca.collar_id ||
                                    "—"
                                )}

                            </span>

                        </td>


                        <td>

                            <span
                                class="estado ${
                                    esActiva
                                        ? "activa"
                                        : "inactiva"
                                }"
                            >

                                ${escaparHTML(
                                    estado
                                )}

                            </span>

                        </td>


                        <td>

                            <button

                                type="button"

                                class="boton-accion ${claseBoton}"

                                onclick="
                                    cambiarEstadoVaca(
                                        '${escaparHTML(vaca.vaca_id)}',
                                        '${esActiva ? "inactiva" : "activa"}',
                                        '${escaparHTML(vaca.nombre)}'
                                    )
                                "

                            >

                                ${botonTexto}

                            </button>

                        </td>

                    </tr>

                `;

            }

        ).join("");

}

async function cambiarEstadoVaca(
    vacaId,
    nuevoEstado,
    nombreVaca
) {

    const mensajeConfirmacion =
        nuevoEstado === "inactiva"

            ? `¿Seguro que deseas dar de baja a ${nombreVaca}?\\n\\nLa vaca dejará de estar activa, pero su historial se conservará.`

            : `¿Deseas reactivar a ${nombreVaca}?`;


    const confirmar =
        window.confirm(
            mensajeConfirmacion
        );


    if (!confirmar) {

        return;

    }


    try {

        const respuesta =
            await fetch(
                `/api/vacas/${encodeURIComponent(vacaId)}/estado`,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            estado:
                                nuevoEstado

                        })

                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            throw new Error(
                resultado.error ||
                "No se pudo cambiar el estado de la vaca."
            );

        }


        mostrarMensaje(
            resultado.mensaje,
            "exito"
        );


        await cargarVacas();


    } catch (error) {

        console.error(
            error
        );


        mostrarMensaje(
            error.message,
            "error"
        );

    }

}


// ======================================================
// GUARDAR VACA
// ======================================================

form.addEventListener(
    "submit",
    async function (
        evento
    ) {

        evento.preventDefault();


        ocultarMensaje();


        const datos = {

            vaca_id:
                document
                    .getElementById(
                        "vaca_id"
                    )
                    .value
                    .trim(),

            nombre:
                document
                    .getElementById(
                        "nombre"
                    )
                    .value
                    .trim(),

            raza:
                document
                    .getElementById(
                        "raza"
                    )
                    .value
                    .trim(),

            sexo:
                document
                    .getElementById(
                        "sexo"
                    )
                    .value,

            edad:
                document
                    .getElementById(
                        "edad"
                    )
                    .value,

            peso:
                document
                    .getElementById(
                        "peso"
                    )
                    .value,

            collar_id:
                document
                    .getElementById(
                        "collar_id"
                    )
                    .value
                    .trim(),

            estado:
                document
                    .getElementById(
                        "estado"
                    )
                    .value

        };


        if (
            !datos.vaca_id ||
            !datos.nombre ||
            !datos.raza ||
            !datos.sexo ||
            !datos.collar_id
        ) {

            mostrarMensaje(
                "Completa todos los campos obligatorios.",
                "error"
            );

            return;

        }


        btnGuardar.disabled =
            true;

        btnGuardar.textContent =
            "Guardando...";


        try {

            const respuesta =
                await fetch(
                    "/api/vacas",
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify(
                                datos
                            )

                    }
                );


            const resultado =
                await respuesta.json();


            if (
                !respuesta.ok
            ) {

                throw new Error(
                    resultado.error ||
                    "No se pudo registrar la vaca."
                );

            }


            mostrarMensaje(
                "Vaca registrada correctamente.",
                "exito"
            );


            form.reset();


            document
                .getElementById(
                    "raza"
                )
                .value =
                "Brangus";


            document
                .getElementById(
                    "estado"
                )
                .value =
                "activa";


            await cargarVacas();


        } catch (error) {

            console.error(
                error
            );


            mostrarMensaje(
                error.message,
                "error"
            );


        } finally {

            btnGuardar.disabled =
                false;

            btnGuardar.textContent =
                "+ Registrar vaca";

        }

    }
);


// ======================================================
// LIMPIAR FORMULARIO
// ======================================================

btnLimpiar.addEventListener(
    "click",
    function () {

        form.reset();


        document
            .getElementById(
                "raza"
            )
            .value =
            "Brangus";


        document
            .getElementById(
                "estado"
            )
            .value =
            "activa";


        ocultarMensaje();

    }
);


// ======================================================
// INICIAR
// ======================================================

cargarVacas();