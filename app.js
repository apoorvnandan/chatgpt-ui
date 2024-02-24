const insertHTML = (el, html) => el.insertAdjacentHTML("afterbegin", html);

const replaceHTML = (el, html) => {
	el.replaceChildren();
	insertHTML(el, html);
};

class State {
    constructor(value) {
        this.value = value
        this.callbacks = []
    }
    async set(newValue) {
        this.value = newValue;
        this.callbacks.forEach(callback => callback());
        await Promise.all(this.callbacks.map(callback =>
            Promise.resolve().then(callback)
        ));
    }
    attach(callback) {
        this.callbacks.push(callback)
    }
}

let KEY = '';
async function hitOpenaiApi(conversation) {
    const headers = {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json'
    };
    const jsonData = {
        'model': 'gpt-4-1106-preview',
        //'model': 'gpt-3.5-turbo-0125',
        'seed': 1123,
        'messages': conversation
    };

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(jsonData)
        });

        if (!response.ok) {
            throw new Error(`Error from OpenAI: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error.message);
        return { error: error.message };
    }
}



const convo = new State([])
const running = new State(false)
convo.attach(()=>{
    let h = ''
    for (let m of convo.value) {
        h += `${m.role}: ${m.content}`
        h += '<div class="h-1 w-full my-4 border-t border-neutral-400"></div>'
    }
    replaceHTML(document.getElementById('convo'), h)
})

running.attach(()=>{
    const el = document.getElementById('running')
    let h = ''
    if (running.value) 
        h = 'running...'
    replaceHTML(el, h)

})

function getTextFromConvo() {
    let t = ''
    for (let m of convo.value) {
        t += `${m.role}: ${m.content}\n\n`
    }
    return t;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('download').addEventListener('click', () => {
        const text = getTextFromConvo()
        const blob = new Blob([text], { type: 'text/plain' });
        const link = document.createElement('a');
        link.download = 'convo.md';
        link.href = window.URL.createObjectURL(blob);
        link.click();
    })
    var textarea = document.getElementById("msg")

    textarea.addEventListener('keydown', async function (event) {
        // Check if Enter is pressed without the Shift key
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default Enter behavior
            //this.form.submit(); // Submit the form
            const inp = document.getElementById('msg')
            const msg = inp.value
            convo.set([...convo.value, {role: 'user', content: msg}])
            inp.value = ''
            running.set(true)
            const completion = await hitOpenaiApi(convo.value)
            running.set(false)
            const reply = completion['choices'][0]['message']['content']
            convo.set([...convo.value, {role: 'assistant', content: reply}])
        }


        // Check if Shift + Enter is pressed
        // if (event.key === 'Enter' && event.shiftKey) {
        //     // Grow the textarea
        //     this.style.height = (this.scrollHeight + 16) + 'px';
        // }
    });

    textarea.addEventListener('input', adjustHeight);

    function adjustHeight() {
        this.style.height = 'auto'; // Reset height to auto
        this.style.height = (this.scrollHeight) + 'px'; // Adjust height
    }
    KEY = prompt("OPENAI KEY")
    document.getElementById('msg').focus()
})

const onSubmit = (e) => {
    e.preventDefault();
    console.log(e)
}

