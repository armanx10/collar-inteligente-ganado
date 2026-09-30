import requests
from database import db


URL = "http://127.0.0.1:5000/api/mediciones"


def buscar_punto_dentro(puntos):
    """
    Busca un punto que realmente esté dentro del polígono
    usando MongoDB $geoIntersects antes de enviarlo a Flask.
    """

    vertices = puntos[:-1] if puntos and puntos[0] == puntos[-1] else puntos

    if len(vertices) < 3:
        return None

    # 1. Promedio de vértices
    longitud_promedio = sum(
        p[0] for p in vertices
    ) / len(vertices)

    latitud_promedio = sum(
        p[1] for p in vertices
    ) / len(vertices)

    candidatos = [
        [longitud_promedio, latitud_promedio]
    ]

    # 2. Puntos entre el promedio y cada vértice
    for longitud, latitud in vertices:

        candidatos.append([
            (longitud + longitud_promedio) / 2,
            (latitud + latitud_promedio) / 2
        ])

    # 3. Rejilla sobre el bounding box
    longitudes = [
        p[0] for p in vertices
    ]

    latitudes = [
        p[1] for p in vertices
    ]

    min_lng = min(longitudes)
    max_lng = max(longitudes)

    min_lat = min(latitudes)
    max_lat = max(latitudes)

    pasos = 10

    for i in range(pasos + 1):

        for j in range(pasos + 1):

            lng = (
                min_lng
                + (max_lng - min_lng)
                * i
                / pasos
            )

            lat = (
                min_lat
                + (max_lat - min_lat)
                * j
                / pasos
            )

            candidatos.append([
                lng,
                lat
            ])

    # Comprobar cada candidato
    for lng, lat in candidatos:

        punto = {
            "type": "Point",
            "coordinates": [
                lng,
                lat
            ]
        }

        encontrado = db["ranchos"].find_one({

            "ubicacion": {

                "$geoIntersects": {

                    "$geometry": punto

                }

            }

        })

        if encontrado:

            return [
                lng,
                lat
            ]

    return None


def obtener_vaca():

    respuesta = requests.get(
        "http://127.0.0.1:5000/api/vacas"
    )

    respuesta.raise_for_status()

    vacas = respuesta.json()

    if not vacas:

        raise RuntimeError(
            "No hay vacas registradas."
        )

    return vacas[0]


def enviar_medicion(
    vaca,
    ubicacion
):

    datos = {

        "metadata": {

            "vaca_id":
                vaca["vaca_id"],

            "collar_id":
                vaca["collar_id"]

        },

        "temperatura":
            38.4,

        "frecuencia_cardiaca":
            72,

        "frecuencia_respiratoria":
            24,

        "ubicacion": {

            "type":
                "Point",

            "coordinates":
                ubicacion

        },

        "voltaje_bateria":
            3.95

    }


    respuesta = requests.post(
        URL,
        json=datos
    )


    print(
        "HTTP:",
        respuesta.status_code
    )


    try:

        print(
            respuesta.json()
        )

    except ValueError:

        print(
            respuesta.text
        )


def main():

    print(
        "Consultando vacas..."
    )


    vaca = obtener_vaca()


    print(
        f"Vaca de prueba: "
        f"{vaca['nombre']} "
        f"({vaca['vaca_id']})"
    )


    print(
        "\nConsultando el rancho..."
    )


    respuesta = requests.get(
        "http://127.0.0.1:5000/api/ranchos"
    )

    respuesta.raise_for_status()


    ranchos = respuesta.json()


    if not ranchos:

        raise RuntimeError(
            "No hay ningún rancho guardado."
        )


    rancho = ranchos[0]


    puntos = (
        rancho["ubicacion"]["coordinates"][0]
    )


    ubicacion = buscar_punto_dentro(
        puntos
    )


    if not ubicacion:

        raise RuntimeError(
            "No se encontró automáticamente "
            "un punto dentro del rancho."
        )


    print(
        "\nSe encontró un punto DENTRO "
        "del rancho:"
    )


    print(
        f"Longitud: {ubicacion[0]}"
    )


    print(
        f"Latitud: {ubicacion[1]}"
    )


    print(
        "\nEnviando una posición "
        "dentro del rancho..."
    )


    enviar_medicion(
        vaca,
        ubicacion
    )


if __name__ == "__main__":

    main()