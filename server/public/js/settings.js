document.addEventListener('DOMContentLoaded', (event) => {
    const chatModel = document.getElementById('selectmodel');
    fetch('/chat-getModel', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => response.json())
        .then(data => {
            console.log(data);
            model = data.model;
            chatModel.value = model;
        })

    fetch('/getUser', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => response.json())
        .then(data => {
            console.log(data);
            names = Object.keys(data);
            var userTable = document.getElementById("userTable");
            for (let i = 0; i < names.length; i++) {
                key = names[i];
                if (key == "admin") {
                    var row = userTable.insertRow(-1);
                    var cell1 = row.insertCell(0);
                    cell1.innerHTML = key;
                    continue;
                }
                console.log(key);
                //create new row with the key and a button
                var row = userTable.insertRow(-1);
                var cell1 = row.insertCell(0);
                var cell2 = row.insertCell(1);
                cell1.innerHTML = key;
                var button = document.createElement("a");
                button.className = "editButton";
                button.innerHTML = "Edit";
                button.type = "button";
                button.href = "/settings/" + key;
                cell2.appendChild(button);
            }
        })
    const chatEnabledCheckbox = document.getElementById('chatEnabled');
    
    chatEnabledCheckbox.addEventListener('change', function () {
        const isChecked = chatEnabledCheckbox.checked;
        fetch('/set-chat', {
            method: 'POST',
            body: JSON.stringify({ chatEnabled: isChecked }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
    });

    chatEnabledCheckbox.checked = chatEnabled === 'true';
    chatModel.value = model;

    chatModel.onchange = function () {
        console.log(chatModel.value);
        fetch('/chat-setModel', {
            method: 'POST',
            body: JSON.stringify({ model: chatModel.value }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
    };
});
