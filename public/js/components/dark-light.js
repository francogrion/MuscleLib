const LOGO_LIGHT = 'https://cdn.shardcloud.app/4d7d8031-4b99-4759-afbc-1e01575b29d6/musclelib_logo.png';
const LOGO_DARK = 'https://n519x3fvhoado5zf.public.blob.vercel-storage.com/avatars/69651f2b148c75323c2a9c7e/1769382801270.svg';

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    function updateLogo(theme) {
        const logoImg = document.getElementById('logo-img');
        if (logoImg) {
            logoImg.src = theme === 'light-mode' ? LOGO_LIGHT : LOGO_DARK;
        }
    }

    // Função para alternar entre ícones de sol e lua
    function updateIcon(theme) {
        if (theme == 'dark-mode') {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        } else {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }

    // Verifica o tema salvo no localStorage ou aplica o tema do sistema
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.classList.add(savedTheme);
        updateIcon(savedTheme);
        updateLogo(savedTheme);
    } else {
        // Verifica o tema preferido do sistema (escuro ou claro)
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-mode' : 'light-mode';
        document.body.classList.add(systemTheme);
        updateIcon(systemTheme);
        updateLogo(systemTheme);
    }

    // Evento para alternar o tema ao clicar no botão
    themeToggle.addEventListener('click', () => {
        // Adiciona a classe para animação de rotação
        themeIcon.classList.add('rotate');

        // Alterna entre os modos claro e escuro
        document.body.classList.toggle('dark-mode');

        // Define o tema atual
        const currentTheme = document.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode';

        // Salva o tema atual no localStorage
        localStorage.setItem('theme', currentTheme);

        // Atualiza o ícone com base no tema
        updateIcon(currentTheme);
        updateLogo(currentTheme);

        // Remove a classe de rotação após a animação (500ms)
        setTimeout(() => {
            themeIcon.classList.remove('rotate');
        }, 500);
    });
});
