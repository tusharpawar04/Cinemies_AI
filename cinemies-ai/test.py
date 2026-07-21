from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
vec = model.encode('A thief who enters dreams to steal secrets')
print(vec.shape)
print('First 5 values:', vec[:5])
