/* Backend bindings kept separate from the exported Stitch presentation. */
document.querySelectorAll('a[href="#"]').forEach(link => {
  if (link.textContent.includes('Passportly')) link.href = '/';
  else if (/Tableau de bord|Profil/.test(link.textContent)) link.href = '/account';
  else if (/Schengen/.test(link.textContent)) link.href = '/itinerary';
  else if (/API|Développeurs/.test(link.textContent)) link.href = '/developer';
  else if (/Retours|Entraide/.test(link.textContent)) link.href = '/community';
  else link.href = '/data-policy';
});
if (location.pathname === '/register' && typeof switchAuthTab === 'function') switchAuthTab('register');
for (const mode of ['login', 'register']) {
  const form = document.querySelector(`#${mode}-panel form`);
  if (!form) continue;
  form.removeAttribute('onsubmit');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    let notice = form.querySelector('[role="status"]');
    if (!notice) { notice = document.createElement('p'); notice.setAttribute('role', 'status'); form.append(notice); }
    button.disabled = true;
    notice.textContent = 'Connexion en cours…';
    try {
      const email = document.getElementById(mode === 'login' ? 'login-id' : 'reg-email').value;
      const password = document.getElementById(mode === 'login' ? 'login-password' : 'reg-pwd').value;
      const response = await fetch(`/api/auth/${mode}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Connexion impossible.');
      location.assign('/account');
    } catch (error) { notice.textContent = error.message || 'Service indisponible.'; }
    finally { button.disabled = false; }
  });
}
