document.addEventListener("DOMContentLoaded", async () => {
  // 1. INITIALIZE SUPABASE 
const _supabase = supabase.createClient('https://brreqfxtesvavfdaidwi.supabase.co', 'sb_publishable_3x4bvAl-vr2bBgNZkzh04w_suiCtcf5');



// --- EXISTING NAVBAR CODE ---
const menu = document.querySelector('.navbar__menu');
const menuBtn = document.querySelector('#mobile-menu');
if (menuBtn && menu) {
menuBtn.addEventListener('click', () => {
menuBtn.classList.toggle('active'); 
menu.classList.toggle('active');    
    });
  }

  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('active'); 
      menu.classList.toggle('active');    
    });
  }

  // --- NEW AUTHENTICATION LOGIC ---
  const loginForm = document.querySelector('#login-form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailField = document.querySelector('#email');
      const passwordField = document.querySelector('#password');
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (emailField && passwordField) {
        // Provide visual indicator for authentication state
        const originalText = submitBtn ? submitBtn.innerText : "Sign In";
        if (submitBtn) submitBtn.innerText = "Verifying Admin Account...";

        const { data, error } = await _supabase.auth.signInWithPassword({
          email: emailField.value,
          password: passwordField.value,
        });

        if (error) {
          const errMsg = document.createElement('p');
          errMsg.style.color = '#ff6b6b';
          errMsg.style.marginTop = '10px';
          errMsg.textContent = 'Login failed: ' + error.message;
          loginForm.appendChild(errMsg);
          if (submitBtn) submitBtn.innerText = originalText;
        } else {
          console.log("Success! Session token locked down.", data);
          window.location.href = 'research.html';
        }
      }
    });
  }

  // --- SCROLL ANIMATION + TYPING ---
  const boxes = document.querySelectorAll('.info__box');

  const typeText = (element) => {
    const text = element.getAttribute('data-text') || element.innerText;
    element.innerText = ''; 
    let i = 0;

    const typing = setInterval(() => {
      if (i < text.length) {
        element.innerHTML += text.charAt(i);
        i++;
      } else {
        clearInterval(typing);
      }
    }, 100); 
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        
        const heading = entry.target.querySelector('h1');
        if (heading && !heading.classList.contains('typed')) {
          heading.classList.add('typed'); 
          typeText(heading);
        }
      }
    });
  }, { threshold: 0.2 });

  boxes.forEach(box => {
    observer.observe(box);
  });
});