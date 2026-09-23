const form = document.getElementById("contactForm");

form.addEventListener("submit", async(e)=>{

    e.preventDefault();

    const response = await fetch(
        `${API_BASE}/contact`,
        {

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                name:document.getElementById("name").value,

                email:document.getElementById("email").value,

                phone:document.getElementById("phone").value,

                message:document.getElementById("message").value

            })

        }
    );

    const data = await response.json();

    alert(data.message);

    if(response.ok){

        form.reset();

    }

});

const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-menu');

menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});