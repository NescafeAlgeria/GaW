try{
document.getElementById('logout').addEventListener('click', function (e) {
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = '/'; 
});
}catch (error) {
    
}