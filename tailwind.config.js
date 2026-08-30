/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        anton: ["Anton", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      colors: {
        preto: "#050505",
        carvao: "#111111",
        ouro: "#D4AF37",
        "ouro-claro": "#F5D97A",
        "ouro-escuro": "#8C6D1F",
        verde: "#3FA96A",
        vermelho: "#C2453D",
        texto: "#F2EFE6",
        "texto-fraco": "#8A8578",
      },
    },
  },
  plugins: [],
}
