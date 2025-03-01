export function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = localStorage.getItem("theme");
  
    if (currentTheme === "dark") {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  }
  
  export function applyStoredTheme() {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  }
  