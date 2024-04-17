function deleteUser() {
    if (user != "admin") {
        if (confirm("Are you sure you want to delete " + user + "?")) {
            fetch("/deleteUser", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: user
                })
            })
            window.location.href = "/settings";
        }
    } else {
        alert("You cannot delete the admin.")
    }
}

loaded = false
function loadChat() {
    if (loaded) {
        return
    }
    fetch("/load-conversation", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: user
        })
    }).then(response => response.json())
        .then(data => {
            console.log(data);
            var chat = document.getElementById("chat");
            for (let i = 0; i < data.length; i++) {
                var row = chat.insertRow(-1);
                var cell1 = row.insertCell(0);
                var cell2 = row.insertCell(1);
                cell1.innerHTML = data[i].role;
                cell2.innerHTML = data[i].content;
            }
        })
    loaded = true
}