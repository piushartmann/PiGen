var horizontal = window.innerWidth > 800;
var resizerPercentage = 0.5;

document.addEventListener("DOMContentLoaded", function () {
    const resizer = document.getElementById("resizer");
    const chatArea = document.getElementById("chatArea");
    const previewArea = document.getElementById("previewArea");

    resizer.style.position = 'absolute';  // Ensure the resizer is absolutely positioned

    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    function dragMouseDown(e) {
        e.preventDefault();
        if (e.type === 'touchstart' || e.type === 'mousedown') {
            pos3 = e.touches ? e.touches[0].clientX : e.clientX;
            pos4 = e.touches ? e.touches[0].clientY : e.clientY;
        }
        document.onmouseup = closeDragElement;
        document.ontouchend = closeDragElement;
        document.onmousemove = elementDrag;
        document.ontouchmove = elementDrag;
    }

    addEventListener("resize", (event) => {
        if (window.innerWidth > 800) {
            // Horizontal resizing logic            
            previewArea.style.height = window.innerHeight + "px";
            previewArea.style.width = (window.innerWidth - resizer.offsetLeft - resizer.offsetWidth) + "px";
            chatArea.style.height = window.innerHeight + "px";
            chatArea.style.width = resizer.offsetLeft + "px";
            if (horizontal) { return; };
            horizontal = true;
            resizer.style.top = "0px";
            resizer.style.left = "50%";
            console.log("Horizontal resizing");
        }
        else {
            // Vertical resizing logic
            chatArea.style.width = window.innerWidth + "px";
            chatArea.style.height = (window.innerHeight - resizer.offsetTop - resizer.offsetHeight) + "px";
            previewArea.style.width = window.innerWidth + "px";
            previewArea.style.height = resizer.offsetTop + "px";
            if (!horizontal) { return; };
            horizontal = false;
            resizer.style.left = "0px";
            resizer.style.top = "50%";
            console.log("Vertical resizing");
        }
    });

    function elementDrag(e) {
        e.preventDefault();
        if (e.touches || e.type === 'touchmove') {
            pos1 = pos3 - (e.touches ? e.touches[0].clientX : e.clientX);
            pos2 = pos4 - (e.touches ? e.touches[0].clientY : e.clientY);
            pos3 = e.touches ? e.touches[0].clientX : e.clientX;
            pos4 = e.touches ? e.touches[0].clientY : e.clientY;
        } else {
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
        }

        if (window.innerWidth <= 800) {
            // Vertical resizing logic
            const newTop = resizer.offsetTop - pos2;
            resizer.style.top = newTop + "px";
            resizerPercentage = newTop / window.innerWidth;
            chatArea.style.height = (window.innerHeight - newTop - resizer.offsetHeight) + "px";
            previewArea.style.height = newTop + "px";
            chatArea.style.width = window.innerWidth + "px";
            previewArea.style.width = window.innerWidth + "px";
            resizer.style.left = "0px";

        } else {
            // Horizontal resizing logic
            const newLeft = resizer.offsetLeft - pos1;
            resizer.style.left = newLeft + "px";
            resizerPercentage = newLeft / window.innerWidth;
            previewArea.style.width = (window.innerWidth - newLeft - resizer.offsetWidth) + "px";
            chatArea.style.width = newLeft + "px";
            chatArea.style.height = window.innerHeight + "px";
            previewArea.style.height = window.innerHeight + "px";
            resizer.style.top = "0px";
        }
    }

    function closeDragElement() {
        // Stop moving when mouse button is released or touch ends
        document.onmouseup = null;
        document.ontouchend = null;
        document.onmousemove = null;
        document.ontouchmove = null;
    }

    resizer.onmousedown = dragMouseDown;
    resizer.ontouchstart = dragMouseDown;
});
