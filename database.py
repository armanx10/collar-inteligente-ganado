from pymongo import MongoClient

# CONEXIÓN A MONGODB

MONGO_URI = "mongodb://localhost:27017/"

client = MongoClient(MONGO_URI)

# Base de datos
db = client["ganado_inteligente"]

# Colecciones
vacas = db["vacas"]
collares = db["collares"]
mediciones = db["mediciones"]
pesajes = db["pesajes"]
alertas = db["alertas"]