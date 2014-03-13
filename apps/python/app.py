from flask import Flask, url_for, render_template

app = Flask(__name__)


@app.route("/")
def hello():
    css_url = url_for('static', filename='main.css')
    return render_template('index.html', css_url=css_url)

if __name__ == "__main__":
    app.run(host='0.0.0.0')
