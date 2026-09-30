import requests
from datetime import datetime, timezone

BASE_URL = "http://127.0.0.1:5000"


def enviar_medicion(vaca, longitud, latitud):
    datos = {
        "metadata": {
            "vaca_id": vaca["vaca_id"],
            "collar_id": vaca["collar_id"]
        },
        "temperatura": 38.5,
        "frecuencia_cardiaca": 72,
        "frecuencia_respiratoria": 24,
        "voltaje_bateria": 3.9,
        "ubicacion": {
            "type": "Point",
            "coordinates": [longitud, latitud]
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    respuesta = requests.post(
        f"{BASE_URL}/api/mediciones",
        json=datos,
        timeout=10
    )

    print("\nHTTP:", respuesta.status_code)
    print(respuesta.json())


def main():

    print("Consultando vacas...")

    respuesta_vacas = requests.get(
        f"{BASE_URL}/api/vacas",
        timeout=10
    )

    respuesta_vacas.raise_for_status()

    vacas = respuesta_vacas.json()

    if not vacas:
        print("No hay vacas registradas.")
        return

    vaca = vacas[0]

    print(
        f"Vaca de prueba: {vaca['nombre']} "
        f"({vaca['vaca_id']})"
    )

    print("\nEnviando una posición MUY LEJANA para forzar una prueba fuera del rancho...")
    enviar_medicion(
        vaca,
        longitud=0.0,
        latitud=0.0
    )

    print("\nConsultando el estado actual...")

    respuesta_estado = requests.get(
        f"{BASE_URL}/api/vacas/ubicaciones",
        timeout=10
    )

    respuesta_estado.raise_for_status()

    estados = respuesta_estado.json()

    for estado in estados:

        if estado["vaca_id"] == vaca["vaca_id"]:

            print("\nEstado encontrado:")
            print(estado)
            break

    print("\nConsultando alertas...")

    respuesta_alertas = requests.get(
        f"{BASE_URL}/api/alertas",
        timeout=10
    )

    respuesta_alertas.raise_for_status()

    alertas = respuesta_alertas.json()

    alertas_perimetro = [
        alerta
        for alerta in alertas
        if alerta.get("vaca_id") == vaca["vaca_id"]
        and alerta.get("tipo") == "fuera_perimetro"
    ]

    print("\nAlertas de perímetro para esta vaca:")

    for alerta in alertas_perimetro:
        print(alerta)

    if not alertas_perimetro:
        print("No se encontró una alerta de fuera de perímetro.")


if __name__ == "__main__":
    main()