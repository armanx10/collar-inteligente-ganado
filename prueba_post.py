import requests
from datetime import datetime, timezone


# ==========================================
# DATOS DE PRUEBA
# ==========================================

datos = {

    "timestamp": datetime.now(
        timezone.utc
    ).isoformat(),

    "metadata": {

        "vaca_id": "01994316",

        "collar_id": "COLLAR001"
    },

    "temperatura": 38.6,

    "frecuencia_cardiaca": 74,

    "frecuencia_respiratoria": 24,

    "movimiento": {

        "acelerometro": {

            "x": 0.12,

            "y": 0.34,

            "z": 0.91
        },

        "giroscopio": {

            "x": 0.02,

            "y": 0.01,

            "z": 0.03
        }
    },

    "movimientos_ruminales": 18,

    "ganancia_diaria_peso_estimada": 0.55,

    "indice_riesgo_parasitario": 0.15,

    "ubicacion": {

        "type": "Point",

        "coordinates": [

            -103.0002,

            19.0001

        ]
    },

    "voltaje_bateria": 3.90
}


# ==========================================
# ENVIAR MEDICIÓN
# ==========================================

try:

    respuesta = requests.post(

        "http://127.0.0.1:5000/api/mediciones",

        json=datos,

        timeout=10
    )

    print()
    print("===================================")
    print("      RESPUESTA DEL SERVIDOR")
    print("===================================")
    print()

    print(
        "Código HTTP:",
        respuesta.status_code
    )

    print()

    print(
        "Respuesta:",
        respuesta.json()
    )

except requests.exceptions.ConnectionError:

    print()
    print("❌ NO SE PUDO CONECTAR CON FLASK")
    print()
    print("Asegúrate de haber ejecutado:")
    print()
    print("python app.py")
    print()

except Exception as error:

    print()
    print("❌ ERROR:")
    print(error)