from flask import Flask, jsonify, request, render_template
from datetime import datetime, timezone
import uuid
from database import db


# ==========================================
# CONFIGURACIÓN
# ==========================================

app = Flask(__name__)


# Índice geoespacial para consultar si una posición
# está dentro del polígono del rancho.
try:
    db["ranchos"].create_index([("ubicacion", "2dsphere")])
except Exception as error:
    print("No se pudo crear el índice geoespacial:", error)


# ==========================================
# FUNCIÓN AUXILIAR
# ==========================================

def convertir_datetime_a_string(documento):

    if isinstance(documento, dict):

        resultado = {}

        for clave, valor in documento.items():

            if isinstance(valor, datetime):

                resultado[clave] = valor.isoformat()

            elif isinstance(valor, dict):

                resultado[clave] = convertir_datetime_a_string(
                    valor
                )

            elif isinstance(valor, list):

                nueva_lista = []

                for elemento in valor:

                    if isinstance(elemento, dict):

                        nueva_lista.append(
                            convertir_datetime_a_string(
                                elemento
                            )
                        )

                    elif isinstance(elemento, datetime):

                        nueva_lista.append(
                            elemento.isoformat()
                        )

                    else:

                        nueva_lista.append(
                            elemento
                        )

                resultado[clave] = nueva_lista

            else:

                resultado[clave] = valor

        return resultado

    return documento


# ==========================================
# FUNCIÓN - VERIFICAR PERÍMETRO
# ==========================================

def verificar_perimetro_medicion(
    vaca_id,
    collar_id,
    ubicacion,
    timestamp
):

    """
    Comprueba si la posición GPS de una medición
    está dentro del rancho activo.

    Devuelve la información del perímetro, actualiza
    el estado actual de la vaca y, si está fuera,
    crea una alerta abierta sin duplicarla.

    IMPORTANTE: la medición de la colección Time Series
    se inserta una sola vez, ya con el campo 'perimetro'.
    No hacemos update_one() sobre 'mediciones'.
    """

    if not isinstance(ubicacion, dict):
        return None

    if ubicacion.get("type") != "Point":
        return None

    coordenadas = ubicacion.get("coordinates")

    if (
        not isinstance(coordenadas, list)
        or len(coordenadas) != 2
    ):
        return None

    try:
        longitud = float(coordenadas[0])
        latitud = float(coordenadas[1])
    except (ValueError, TypeError):
        return None

    if not (
        -180 <= longitud <= 180
        and -90 <= latitud <= 90
    ):
        return None

    punto = {
        "type": "Point",
        "coordinates": [
            longitud,
            latitud
        ]
    }

    # Tomamos el rancho activo más reciente.
    rancho = db["ranchos"].find_one(
        {"estado": "activo"},
        sort=[
            ("fecha_creacion", -1)
        ]
    )

    # Todavía no hay rancho para evaluar.
    if not rancho:
        return None

    # MongoDB determina si el punto intersecta
    # el polígono del rancho.
    rancho_contiene_punto = db["ranchos"].find_one(
        {
            "_id": rancho["_id"],
            "ubicacion": {
                "$geoIntersects": {
                    "$geometry": punto
                }
            }
        }
    )

    dentro_perimetro = rancho_contiene_punto is not None

    informacion_perimetro = {
        "dentro": dentro_perimetro,
        "rancho_id": rancho.get("rancho_id"),
        "rancho_nombre": rancho.get("nombre"),
        "latitud": latitud,
        "longitud": longitud
    }

    # Guardamos la última posición y el estado
    # de perímetro de la vaca para consultas rápidas.
    db["vacas"].update_one(
        {"vaca_id": vaca_id},
        {
            "$set": {
                "ubicacion_actual": punto,
                "dentro_perimetro": dentro_perimetro,
                "ultima_actualizacion_ubicacion": timestamp
            }
        }
    )

    # Si salió del rancho, crear una alerta solamente
    # cuando no exista ya una alerta abierta del mismo tipo.
    if not dentro_perimetro:

        alerta_existente = db["alertas"].find_one(
            {
                "vaca_id": vaca_id,
                "collar_id": collar_id,
                "tipo": "fuera_perimetro",
                "atendida": False
            }
        )

        if not alerta_existente:

            descripcion = (
                f"La vaca {vaca_id} salió del perímetro "
                f"del rancho {rancho.get('nombre', 'sin nombre')}"
            )

            db["alertas"].insert_one(
                {
                    "vaca_id": vaca_id,
                    "collar_id": collar_id,
                    "timestamp": timestamp,
                    "tipo": "fuera_perimetro",
                    "ubicacion": punto,
                    "rancho_id": rancho.get("rancho_id"),
                    "valor": {
                        "latitud": latitud,
                        "longitud": longitud
                    },
                    "descripcion": descripcion,
                    "atendida": False
                }
            )

    return informacion_perimetro


# ==========================================
# FRONTEND - PÁGINA PRINCIPAL
# ==========================================

@app.route("/", methods=["GET"])
def inicio():

    return render_template(
        "index.html"
    )


# ==========================================
# FRONTEND - DASHBOARD
# ==========================================

@app.route("/dashboard", methods=["GET"])
def dashboard():
    return render_template("dashboard.html")

@app.route("/vaca/<vaca_id>", methods=["GET"])
def detalle_vaca(vaca_id):
    return render_template(
        "vaca.html",
        vaca_id=vaca_id
    )

@app.route("/rancho")
def pagina_rancho():
    return render_template("rancho.html")

@app.route("/monitoreo", methods=["GET"])
def monitoreo():
    return render_template("monitoreo.html")

@app.route("/ganado", methods=["GET"])
def pagina_ganado():
    return render_template("ganado.html")

# ==========================================
# API - TODAS LAS VACAS
# ==========================================

@app.route(
    "/api/vacas",
    methods=["GET", "POST"]
)
def obtener_vacas():

    # ======================================
    # GET - OBTENER TODAS LAS VACAS
    # ======================================

    if request.method == "GET":

        vacas = list(
            db["vacas"].find(
                {},
                {
                    "_id": 0
                }
            )
        )

        return jsonify(vacas)


    # ======================================
    # POST - REGISTRAR NUEVA VACA
    # ======================================

    datos = request.get_json()


    if not datos:

        return jsonify({
            "error":
                "No se recibieron datos."
        }), 400


    # --------------------------------------
    # CAMPOS OBLIGATORIOS
    # --------------------------------------

    vaca_id = str(
        datos.get(
            "vaca_id",
            ""
        )
    ).strip()


    nombre = str(
        datos.get(
            "nombre",
            ""
        )
    ).strip()


    raza = str(
        datos.get(
            "raza",
            ""
        )
    ).strip()


    sexo = str(
        datos.get(
            "sexo",
            ""
        )
    ).strip().upper()


    collar_id = str(
        datos.get(
            "collar_id",
            ""
        )
    ).strip()


    estado = str(
        datos.get(
            "estado",
            "activa"
        )
    ).strip().lower()


    if not vaca_id:

        return jsonify({
            "error":
                "El ID de la vaca es obligatorio."
        }), 400


    if not nombre:

        return jsonify({
            "error":
                "El nombre de la vaca es obligatorio."
        }), 400


    if not raza:

        return jsonify({
            "error":
                "La raza es obligatoria."
        }), 400


    if sexo not in [
        "MACHO",
        "HEMBRA"
    ]:

        return jsonify({
            "error":
                "El sexo debe ser MACHO o HEMBRA."
        }), 400


    if not collar_id:

        return jsonify({
            "error":
                "El collar es obligatorio."
        }), 400


    if estado not in [
        "activa",
        "inactiva"
    ]:

        return jsonify({
            "error":
                "El estado debe ser activa o inactiva."
        }), 400


    # --------------------------------------
    # VALIDAR DUPLICADOS
    # --------------------------------------

    vaca_existente = db["vacas"].find_one({
            "vaca_id": vaca_id
        })


    if vaca_existente:

        return jsonify({
            "error":
                f"Ya existe una vaca con el ID {vaca_id}."
        }), 409


    collar_existente = db["collares"].find_one({
            "collar_id": collar_id
        })


    if collar_existente:

        return jsonify({
            "error":
                f"El collar {collar_id} ya está registrado."
        }), 409


    # --------------------------------------
    # EDAD
    # --------------------------------------

    edad = None


    if datos.get("edad") not in [
        None,
        ""
    ]:

        try:

            edad = int(
                datos["edad"]
            )

        except (
            ValueError,
            TypeError
        ):

            return jsonify({
                "error":
                    "La edad debe ser un número entero."
            }), 400


        if edad < 0 or edad > 30:

            return jsonify({
                "error":
                    "La edad debe estar entre 0 y 30 años."
            }), 400


    # --------------------------------------
    # PESO
    # --------------------------------------

    peso = None


    if datos.get("peso") not in [
        None,
        ""
    ]:

        try:

            peso = float(
                datos["peso"]
            )

        except (
            ValueError,
            TypeError
        ):

            return jsonify({
                "error":
                    "El peso debe ser un número."
            }), 400


        if peso <= 0:

            return jsonify({
                "error":
                    "El peso debe ser mayor que 0."
            }), 400


    # --------------------------------------
    # DOCUMENTO DE LA VACA
    # --------------------------------------

    documento_vaca = {

        "vaca_id":
            vaca_id,

        "nombre":
            nombre,

        "raza":
            raza,

        "edad":
            edad,

        "peso":
            peso,

        "sexo":
            sexo,

        "collar_id":
            collar_id,

        "estado":
            estado

    }


    # --------------------------------------
    # DOCUMENTO DEL COLLAR
    # --------------------------------------

    documento_collar = {

        "collar_id":
            collar_id,

        "vaca_id":
            vaca_id,

        "modelo":
            "ESP32",

        "estado":
            "activo",

        "fecha_instalacion":
            datetime.now(
                timezone.utc
            )

    }


    # --------------------------------------
    # GUARDAR
    # --------------------------------------

    db["vacas"].insert_one(
        documento_vaca
    )


    db["collares"].insert_one(
        documento_collar
    )


    return jsonify({

        "mensaje":
            "Vaca registrada correctamente.",

        "vaca":
            documento_vaca,

        "collar":
            documento_collar

    }), 201

# ==========================================
# API - UNA VACA
# ==========================================

@app.route("/api/vacas/<vaca_id>", methods=["GET"])
def obtener_vaca(vaca_id):

    vaca = db["vacas"].find_one(
        {
            "vaca_id": vaca_id
        },
        {
            "_id": 0
        }
    )

    if not vaca:

        return jsonify({
            "error": "Vaca no encontrada"
        }), 404

    return jsonify(vaca)

# ==========================================
# API - CAMBIAR ESTADO DE UNA VACA
# ==========================================

@app.route(
    "/api/vacas/<vaca_id>/estado",
    methods=["PATCH"]
)
def cambiar_estado_vaca(vaca_id):

    datos = request.get_json()


    if not datos:

        return jsonify({
            "error":
                "No se recibieron datos."
        }), 400


    nuevo_estado = str(
        datos.get(
            "estado",
            ""
        )
    ).strip().lower()


    if nuevo_estado not in [
        "activa",
        "inactiva"
    ]:

        return jsonify({
            "error":
                "El estado debe ser activa o inactiva."
        }), 400


    vaca = db["vacas"].find_one({
        "vaca_id": vaca_id
    })


    if not vaca:

        return jsonify({
            "error":
                "Vaca no encontrada."
        }), 404


    db["vacas"].update_one(

        {
            "vaca_id":
                vaca_id
        },

        {
            "$set": {

                "estado":
                    nuevo_estado

            }
        }

    )


    # --------------------------------------
    # Actualizar también el collar
    # --------------------------------------

    nuevo_estado_collar = (

        "activo"

        if nuevo_estado == "activa"

        else "inactivo"

    )


    if vaca.get("collar_id"):

        db["collares"].update_one(

            {
                "collar_id":
                    vaca["collar_id"]
            },

            {
                "$set": {

                    "estado":
                        nuevo_estado_collar

                }
            }

        )


    return jsonify({

        "mensaje":
            (
                "Vaca reactivada correctamente."
                if nuevo_estado == "activa"
                else
                "Vaca dada de baja correctamente."
            ),

        "vaca_id":
            vaca_id,

        "estado":
            nuevo_estado

    }), 200


# ==========================================
# API - MEDICIONES
# ==========================================

@app.route(
    "/api/vacas/<vaca_id>/mediciones",
    methods=["GET"]
)
def obtener_mediciones(vaca_id):

    mediciones = list(
        db["mediciones"].find(
            {
                "metadata.vaca_id": vaca_id
            },
            {
                "_id": 0
            }
        ).sort(
            "timestamp",
            -1
        )
    )

    mediciones = [
        convertir_datetime_a_string(
            medicion
        )
        for medicion in mediciones
    ]

    return jsonify(mediciones)


# ==========================================
# API - ÚLTIMA MEDICIÓN
# ==========================================

@app.route(
    "/api/vacas/<vaca_id>/ultima-medicion",
    methods=["GET"]
)
def obtener_ultima_medicion(vaca_id):

    medicion = db["mediciones"].find_one(
        {
            "metadata.vaca_id": vaca_id
        },
        {
            "_id": 0
        },
        sort=[
            ("timestamp", -1)
        ]
    )

    if not medicion:

        return jsonify({
            "error": "No existen mediciones para esta vaca"
        }), 404

    medicion = convertir_datetime_a_string(
        medicion
    )

    return jsonify(medicion)


# ==========================================
# API - PESAJE
# ==========================================

@app.route(
    "/api/vacas/<vaca_id>/pesajes",
    methods=["GET"]
)
def obtener_pesajes(vaca_id):

    pesajes = list(
        db["pesajes"].find(
            {
                "vaca_id": vaca_id
            },
            {
                "_id": 0
            }
        ).sort(
            "fecha",
            1
        )
    )

    pesajes = [
        convertir_datetime_a_string(
            peso
        )
        for peso in pesajes
    ]

    return jsonify(pesajes)


# ==========================================
# API - ALERTAS
# ==========================================

@app.route(
    "/api/alertas",
    methods=["GET"]
)
def obtener_alertas():

    alertas = list(
        db["alertas"].find(
            {},
            {
                "_id": 0
            }
        ).sort(
            "timestamp",
            -1
        )
    )

    alertas = [
        convertir_datetime_a_string(
            alerta
        )
        for alerta in alertas
    ]

    return jsonify(alertas)


# ==========================================
# API - RESUMEN DE UNA VACA
# ==========================================

@app.route(
    "/api/vacas/<vaca_id>/resumen",
    methods=["GET"]
)
def obtener_resumen_vaca(vaca_id):

    vaca = db["vacas"].find_one(
        {
            "vaca_id": vaca_id
        },
        {
            "_id": 0
        }
    )

    if not vaca:

        return jsonify({
            "error": "Vaca no encontrada"
        }), 404


    ultima_medicion = db["mediciones"].find_one(
        {
            "metadata.vaca_id": vaca_id
        },
        {
            "_id": 0
        },
        sort=[
            ("timestamp", -1)
        ]
    )


    ultimo_peso = db["pesajes"].find_one(
        {
            "vaca_id": vaca_id
        },
        {
            "_id": 0
        },
        sort=[
            ("fecha", -1)
        ]
    )


    alertas = list(
        db["alertas"].find(
            {
                "vaca_id": vaca_id,
                "atendida": False
            },
            {
                "_id": 0
            }
        ).sort(
            "timestamp",
            -1
        )
    )


    if ultima_medicion:

        ultima_medicion = convertir_datetime_a_string(
            ultima_medicion
        )


    if ultimo_peso:

        ultimo_peso = convertir_datetime_a_string(
            ultimo_peso
        )


    alertas = [
        convertir_datetime_a_string(
            alerta
        )
        for alerta in alertas
    ]


    return jsonify({

        "vaca": vaca,

        "ultima_medicion":
            ultima_medicion,

        "ultimo_peso":
            ultimo_peso,

        "alertas":
            alertas
    })


# ==========================================
# API - RECIBIR MEDICIÓN
# ==========================================

@app.route(
    "/api/mediciones",
    methods=["POST"]
)
def registrar_medicion():

    datos = request.get_json()


    if not datos:

        return jsonify({
            "error": "No se recibieron datos"
        }), 400


    if "metadata" not in datos:

        return jsonify({
            "error": "Falta metadata"
        }), 400


    if "vaca_id" not in datos["metadata"]:

        return jsonify({
            "error": "Falta vaca_id"
        }), 400


    if "collar_id" not in datos["metadata"]:

        return jsonify({
            "error": "Falta collar_id"
        }), 400


    vaca_id = datos["metadata"]["vaca_id"]

    collar_id = datos["metadata"]["collar_id"]


    # ==========================================
    # VALIDAR EXISTENCIA DE LA VACA
    # ==========================================

    vaca = db["vacas"].find_one({
        "vaca_id": vaca_id
    })

    if not vaca:
        return jsonify({
            "error": "La vaca no existe."
        }), 404

    # ==========================================
    # VALIDAR ESTADO DE LA VACA
    # ==========================================

    if vaca.get("estado", "activa") != "activa":
        return jsonify({
            "error": "La vaca está inactiva y no puede enviar mediciones."
        }), 409

    # ==========================================
    # VALIDAR EXISTENCIA DEL COLLAR
    # ==========================================

    collar = db["collares"].find_one({
        "collar_id": collar_id
    })

    if not collar:
        return jsonify({
            "error": "El collar no existe."
        }), 404

    # ==========================================
    # VALIDAR ESTADO DEL COLLAR
    # ==========================================

    if collar.get("estado", "activo") != "activo":
        return jsonify({
            "error": "El collar está inactivo y no puede enviar mediciones."
        }), 409


    if "timestamp" in datos:

        try:

            datos["timestamp"] = datetime.fromisoformat(
                datos["timestamp"].replace(
                    "Z",
                    "+00:00"
                )
            )

        except Exception:

            return jsonify({
                "error": "Formato de timestamp inválido"
            }), 400

    else:

        datos["timestamp"] = datetime.now(
            timezone.utc
        )


    # Verificar el perímetro ANTES de insertar la medición.
    # Esto es necesario porque 'mediciones' es una colección
    # Time Series y no queremos modificar el documento después.
    informacion_perimetro = verificar_perimetro_medicion(
        vaca_id=vaca_id,
        collar_id=collar_id,
        ubicacion=datos.get("ubicacion"),
        timestamp=datos["timestamp"]
    )


    if informacion_perimetro is not None:

        datos["perimetro"] = informacion_perimetro


    resultado = db["mediciones"].insert_one(
        datos
    )


    return jsonify({

        "mensaje":
            "Medición registrada correctamente",

        "id":
            str(resultado.inserted_id),

        "perimetro":
            informacion_perimetro

    }), 201

# ==========================================
# API - UBICACIONES ACTUALES DE LAS VACAS
# ==========================================

@app.route(
    "/api/vacas/ubicaciones",
    methods=["GET"]
)
def obtener_ubicaciones_vacas():

    vacas = list(
        db["vacas"].find(
            {},
            {
                "_id": 0,
                "vaca_id": 1,
                "nombre": 1,
                "collar_id": 1,
                "estado": 1,
                "ubicacion_actual": 1,
                "dentro_perimetro": 1,
                "ultima_actualizacion_ubicacion": 1
            }
        )
    )

    resultado = []

    for vaca in vacas:

        medicion = db["mediciones"].find_one(
            {
                "metadata.vaca_id": vaca["vaca_id"],
                "ubicacion.type": "Point"
            },
            {
                "_id": 0
            },
            sort=[
                ("timestamp", -1)
            ]
        )

        registro = {
            "vaca_id": vaca.get("vaca_id"),
            "nombre": vaca.get("nombre"),
            "collar_id": vaca.get("collar_id"),
            "estado": vaca.get("estado"),
            "ubicacion": vaca.get("ubicacion_actual"),
            "dentro_perimetro": vaca.get("dentro_perimetro"),
            "timestamp": vaca.get(
                "ultima_actualizacion_ubicacion"
            )
        }

        if medicion:

            registro["ubicacion"] = medicion.get(
                "ubicacion"
            )

            registro["dentro_perimetro"] = (
                medicion.get("perimetro", {})
                .get("dentro", registro["dentro_perimetro"])
            )

            registro["timestamp"] = medicion.get(
                "timestamp"
            )

        registro = convertir_datetime_a_string(
            registro
        )

        resultado.append(registro)

    return jsonify(resultado)


# ==========================================
# API - GUARDAR RANCHO
# ==========================================

@app.route("/api/ranchos", methods=["POST"])
def guardar_rancho():

    datos = request.get_json()

    if not datos:
        return jsonify({
            "error": "No se recibieron datos"
        }), 400

    nombre = datos.get(
        "nombre",
        "Rancho principal"
    )

    puntos = datos.get("puntos")

    # --------------------------------------
    # VALIDAR PUNTOS
    # --------------------------------------

    if not isinstance(puntos, list):
        return jsonify({
            "error": "Los puntos deben ser una lista"
        }), 400

    if len(puntos) < 3:
        return jsonify({
            "error": "Se necesitan al menos 3 puntos"
        }), 400

    coordenadas = []

    for punto in puntos:

        if (
            not isinstance(punto, list)
            or len(punto) != 2
        ):
            return jsonify({
                "error": "Cada punto debe tener [longitud, latitud]"
            }), 400

        try:
            longitud = float(punto[0])
            latitud = float(punto[1])
        except (ValueError, TypeError):
            return jsonify({
                "error": "Las coordenadas deben ser números"
            }), 400

        if not (
            -180 <= longitud <= 180
            and -90 <= latitud <= 90
        ):
            return jsonify({
                "error": "Coordenadas inválidas"
            }), 400

        coordenadas.append([
            longitud,
            latitud
        ])


    # --------------------------------------
    # CERRAR EL POLÍGONO
    # --------------------------------------

    if coordenadas[0] != coordenadas[-1]:

        coordenadas.append(
            coordenadas[0]
        )

    # --------------------------------------
    # CREAR ID
    # --------------------------------------

    rancho_id = (
        "RANCHO-"
        + uuid.uuid4().hex[:8].upper()
    )

    # --------------------------------------
    # DOCUMENTO PARA MONGODB
    # --------------------------------------

    documento = {

        "rancho_id": rancho_id,

        "nombre": nombre,

        "fecha_creacion":
            datetime.now(
                timezone.utc
            ),

        "ubicacion": {

            "type": "Polygon",

            "coordinates": [
                coordenadas
            ]
        },

        "puntos": len(coordenadas) - 1,

        "estado": "activo"
    }

    # --------------------------------------
    # GUARDAR
    # --------------------------------------

    resultado = db["ranchos"].insert_one(documento)

    return jsonify({

        "mensaje":
            "Rancho guardado correctamente",

        "rancho_id":
            rancho_id,

        "id":
            str(resultado.inserted_id)

    }), 201


# ==========================================
# API - OBTENER RANCHOS
# ==========================================

@app.route(
    "/api/ranchos",
    methods=["GET"]
)
def obtener_ranchos():

    ranchos = list(
        db["ranchos"]
        .find()
        .sort(
            "fecha_creacion",
            -1
        )
    )

    ranchos = [
        convertir_datetime_a_string(
            rancho
        )
        for rancho in ranchos
    ]

    for rancho in ranchos:

        rancho["_id"] = str(
            rancho["_id"]
        )

    return jsonify(
        ranchos
    )


# ==========================================
# INICIAR FLASK
# ==========================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )