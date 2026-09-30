import random
import time
from datetime import datetime, timezone

import requests


# ==========================================
# CONFIGURACIÓN
# ==========================================

API_URL = "http://127.0.0.1:5000"

INTERVALO_SEGUNDOS = 30


# ==========================================
# ESTADO SIMULADO
# ==========================================

# Posición inicial simulada de cada vaca
ubicaciones = {}

# Batería simulada de cada collar
baterias = {}


# ==========================================
# OBTENER VACAS DESDE FLASK
# ==========================================

def obtener_vacas():

    try:

        respuesta = requests.get(
            f"{API_URL}/api/vacas",
            timeout=10
        )

        if respuesta.status_code != 200:

            print(
                "Error obteniendo vacas:",
                respuesta.status_code
            )

            return []

        return respuesta.json()

    except requests.exceptions.ConnectionError:

        print()
        print("❌ No se pudo conectar con Flask.")
        print("Asegúrate de ejecutar:")
        print()
        print("python app.py")
        print()

        return []

    except Exception as error:

        print(
            "Error obteniendo vacas:",
            error
        )

        return []


# ==========================================
# CREAR UBICACIÓN INICIAL
# ==========================================

def obtener_ubicacion(vaca_id):

    if vaca_id not in ubicaciones:

        ubicaciones[vaca_id] = {

            "longitud": -103.0000
            + random.uniform(-0.002, 0.002),

            "latitud": 19.0000
            + random.uniform(-0.002, 0.002)
        }

    else:

        ubicaciones[vaca_id]["longitud"] += random.uniform(
            -0.0001,
            0.0001
        )

        ubicaciones[vaca_id]["latitud"] += random.uniform(
            -0.0001,
            0.0001
        )

    return {

        "type": "Point",

        "coordinates": [

            ubicaciones[vaca_id]["longitud"],

            ubicaciones[vaca_id]["latitud"]

        ]
    }


# ==========================================
# OBTENER BATERÍA
# ==========================================

def obtener_bateria(vaca_id):

    if vaca_id not in baterias:

        baterias[vaca_id] = round(
            random.uniform(3.80, 4.15),
            2
        )

    else:

        baterias[vaca_id] -= random.uniform(
            0.005,
            0.02
        )

        baterias[vaca_id] = max(
            3.20,
            baterias[vaca_id]
        )

    return round(
        baterias[vaca_id],
        2
    )


# ==========================================
# GENERAR MEDICIÓN
# ==========================================

def generar_medicion(vaca):

    vaca_id = vaca["vaca_id"]

    collar_id = vaca["collar_id"]


    # --------------------------------------
    # TEMPERATURA
    # --------------------------------------

    temperatura = round(
        random.uniform(
            38.0,
            39.5
        ),
        2
    )


    # --------------------------------------
    # FRECUENCIA CARDIACA
    # --------------------------------------

    frecuencia_cardiaca = random.randint(
        65,
        85
    )


    # --------------------------------------
    # FRECUENCIA RESPIRATORIA
    # --------------------------------------

    frecuencia_respiratoria = random.randint(
        20,
        30
    )


    # --------------------------------------
    # ACELERÓMETRO
    # --------------------------------------

    acelerometro = {

        "x": round(
            random.uniform(
                -1.0,
                1.0
            ),
            3
        ),

        "y": round(
            random.uniform(
                -1.0,
                1.0
            ),
            3
        ),

        "z": round(
            random.uniform(
                0.5,
                1.2
            ),
            3
        )
    }


    # --------------------------------------
    # GIROSCOPIO
    # --------------------------------------

    giroscopio = {

        "x": round(
            random.uniform(
                -0.2,
                0.2
            ),
            3
        ),

        "y": round(
            random.uniform(
                -0.2,
                0.2
            ),
            3
        ),

        "z": round(
            random.uniform(
                -0.2,
                0.2
            ),
            3
        )
    }


    # --------------------------------------
    # MOVIMIENTOS RUMINALES
    # --------------------------------------

    movimientos_ruminales = random.randint(
        10,
        25
    )


    # --------------------------------------
    # GANANCIA DE PESO
    # --------------------------------------

    ganancia_diaria_peso = round(
        random.uniform(
            0.30,
            0.75
        ),
        2
    )


    # --------------------------------------
    # ÍNDICE DE RIESGO PARASITARIO
    # --------------------------------------

    indice_riesgo_parasitario = round(
        random.uniform(
            0.05,
            0.80
        ),
        2
    )


    # --------------------------------------
    # UBICACIÓN
    # --------------------------------------

    ubicacion = obtener_ubicacion(
        vaca_id
    )


    # --------------------------------------
    # BATERÍA
    # --------------------------------------

    voltaje_bateria = obtener_bateria(
        vaca_id
    )


    # --------------------------------------
    # DOCUMENTO
    # --------------------------------------

    medicion = {

        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),

        "metadata": {

            "vaca_id": vaca_id,

            "collar_id": collar_id
        },

        "temperatura": temperatura,

        "frecuencia_cardiaca":
            frecuencia_cardiaca,

        "frecuencia_respiratoria":
            frecuencia_respiratoria,

        "movimiento": {

            "acelerometro":
                acelerometro,

            "giroscopio":
                giroscopio
        },

        "movimientos_ruminales":
            movimientos_ruminales,

        "ganancia_diaria_peso_estimada":
            ganancia_diaria_peso,

        "indice_riesgo_parasitario":
            indice_riesgo_parasitario,

        "ubicacion":
            ubicacion,

        "voltaje_bateria":
            voltaje_bateria
    }

    return medicion


# ==========================================
# ENVIAR MEDICIÓN A FLASK
# ==========================================

def enviar_medicion(medicion, nombre_vaca):

    try:

        respuesta = requests.post(

            f"{API_URL}/api/mediciones",

            json=medicion,

            timeout=10
        )


        if respuesta.status_code == 201:

            print(

                f"✓ {nombre_vaca} | "

                f"Temp: "
                f"{medicion['temperatura']} °C | "

                f"FC: "
                f"{medicion['frecuencia_cardiaca']} BPM | "

                f"FR: "
                f"{medicion['frecuencia_respiratoria']} RPM | "

                f"Batería: "
                f"{medicion['voltaje_bateria']} V | "

                f"Guardada por Flask"

            )

            return True


        else:

            print(

                f"❌ Error para {nombre_vaca} | "

                f"HTTP {respuesta.status_code} | "

                f"{respuesta.text}"

            )

            return False


    except requests.exceptions.ConnectionError:

        print()
        print(
            "❌ No se pudo conectar con Flask."
        )
        print(
            "Asegúrate de tener "
            "python app.py ejecutándose."
        )
        print()

        return False


    except Exception as error:

        print(

            f"❌ Error enviando "
            f"{nombre_vaca}: {error}"

        )

        return False


# ==========================================
# SIMULADOR
# ==========================================

def ejecutar_simulador():

    print()
    print(
        "=========================================="
    )
    print(
        "      SIMULADOR DE COLLAR INTELIGENTE"
    )
    print(
        "=========================================="
    )

    print(
        f"Intervalo: "
        f"{INTERVALO_SEGUNDOS} segundos"
    )

    print(
        f"API: {API_URL}"
    )

    print()


    while True:

        try:

            vacas = obtener_vacas()


            if not vacas:

                print(
                    "No se encontraron vacas."
                )

                time.sleep(
                    INTERVALO_SEGUNDOS
                )

                continue


            print()

            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] "
                f"Generando mediciones..."
            )

            print()


            for vaca in vacas:

                medicion = generar_medicion(
                    vaca
                )

                enviar_medicion(
                    medicion,
                    vaca["nombre"]
                )


            print()

            print(
                f"Esperando "
                f"{INTERVALO_SEGUNDOS} segundos..."
            )

            time.sleep(
                INTERVALO_SEGUNDOS
            )


        except KeyboardInterrupt:

            print()
            print(
                "Simulador detenido."
            )

            break


        except Exception as error:

            print()
            print(
                "❌ Error general:",
                error
            )

            time.sleep(
                INTERVALO_SEGUNDOS
            )


# ==========================================
# INICIO
# ==========================================

if __name__ == "__main__":

    ejecutar_simulador()