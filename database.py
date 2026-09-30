import os
from pymongo import MongoClient

# Lee la variable de entorno MONGO_URI si existe; si no, usa localhost para desarrollo local
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")

client = MongoClient(MONGO_URI)
db = client["ganado_inteligente"]

# Tus colecciones (mantenlas como las tenías)
vacas = db["vacas"]
collares = db["collares"]
mediciones = db["mediciones"]
pesajes = db["pesajes"]
alertas = db["alertas"]