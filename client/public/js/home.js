var pclay1title = document.getElementById("pclay1title");

window.addEventListener("resize", function () {
    if (window.matchMedia("(max-width: 700px)").matches) {
        pclay1title.classList.remove("displaynone");
    } else if (window.matchMedia("(min-width: 900px)").matches) {
        pclay1title.classList.remove("displaynone");
    } else if (window.matchMedia("(max-width: 900px)").matches) {
        pclay1title.classList.add("displaynone");
    }
})

