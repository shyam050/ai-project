from flask import Flask, render_template, request, jsonify
import speech_recognition as sr
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from collections import Counter
from nltk.corpus import stopwords
import io
import wave

app = Flask(__name__)

# Download necessary NLTK resources
nltk.download('punkt')
nltk.download('stopwords')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process_audio', methods=['POST'])
def process_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    
    # Convert the audio file to WAV format
    audio_data = audio_file.read()
    audio = wave.open(io.BytesIO(audio_data), 'rb')
    
    # Use speech recognition to convert audio to text
    recognizer = sr.Recognizer()
    with sr.AudioFile(io.BytesIO(audio_data)) as source:
        audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data)
        except sr.UnknownValueError:
            return jsonify({'error': 'Could not understand the audio'}), 400
        except sr.RequestError:
            return jsonify({'error': 'Could not connect to Google Speech Recognition service'}), 500

    # Summarize the text
    summary = summarize_text(text)

    return jsonify({
        'transcript': text,
        'summary': summary
    })

def summarize_text(text, summary_ratio=0.35):
    """Extracts key sentences using frequency-based scoring."""
    sentences = sent_tokenize(text)
    if len(sentences) <= 2:
        return text  # Return original text if it's too short

    # Tokenize words and count word frequencies (excluding stopwords)
    stop_words = set(stopwords.words("english"))
    words = word_tokenize(text.lower())
    word_frequencies = Counter(w for w in words if w.isalnum() and w not in stop_words)

    # Score sentences based on normalized word importance
    sentence_scores = {}
    for sentence in sentences:
        sentence_words = word_tokenize(sentence.lower())
        sentence_length = len(sentence_words)
        if sentence_length > 0:
            sentence_scores[sentence] = sum(word_frequencies[word] for word in sentence_words if word in word_frequencies) / sentence_length

    # Select top-ranked sentences
    num_sentences = max(1, int(len(sentences) * summary_ratio))
    best_sentences = sorted(sentence_scores, key=sentence_scores.get, reverse=True)[:num_sentences]

    return " ".join(best_sentences)

if __name__ == '__main__':
    app.run(debug=True)
