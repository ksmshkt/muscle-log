const tabs = document.querySelectorAll("nav button");
const pages = document.querySelectorAll(".page");

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(b => b.classList.remove("active"));
    pages.forEach(p => p.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById("page-" + btn.dataset.tab).classList.add("active");
  });
});
