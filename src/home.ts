import Cookies from "js-cookie";
import Swal from 'sweetalert2';

async function main() {
    let username = Cookies.get("username");
    if (typeof username === 'undefined') {
        const resp = await Swal.fire({
            title: 'Por favor, insira seu nome:',
            input: 'text',
            inputValidator: (value) => {
                if (!value) {
                    return 'Escreva algo :)'
                }
            }
        });
        username = resp.value
        if (username) {
            Cookies.set('username', username, { expires: 365, sameSite: 'strict' });
        } else {
            Swal.fire({
                title: 'Erro',
                text: 'Nome não foi definido',
                icon: 'error'
            });
        }
    }

    if (username) {
        const welcomeDiv = document.getElementById("welcome");
        if (!welcomeDiv) return;
        welcomeDiv.textContent = `Seja bem vindo (a), ${username}`;
        welcomeDiv.style.display = "block"
    }

    const changeNameEl = document.getElementById("change-name");
    if (!changeNameEl) return;
    changeNameEl.addEventListener("click", changeName);
    const linkables = document.getElementsByClassName("linkable") as HTMLCollectionOf<HTMLDivElement>;

    for (let i = 0; i < linkables.length; i++) {
        const linkable = linkables[i]
        const linkableId = linkable.dataset.id
        linkable.addEventListener("click", () => window.location.href = "session.html?id=" + linkableId);
    }
}

function showDropdown(dropdownId: string) {
    const dropdownElement = document.getElementById(dropdownId)
    if (!dropdownElement) return

    if (dropdownElement.style.display == "block") {
        dropdownElement.style.display = "none"
    } else {
        dropdownElement.style.display = "block"
    }
}

function changeName() {
    Cookies.remove("username");
    location.reload();
}

main()

declare global {
    interface Window { showDropdown: (dropdownId: string) => void }
}

window.showDropdown = showDropdown
