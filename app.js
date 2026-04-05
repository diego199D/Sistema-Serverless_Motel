const SUPABASE_URL = 'https://nxaqzhmojgydoyhpbzfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_S99rfoTFEw3IEWpRqdRdUg_RG_cES_D';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Formatting - Forces Local Timezone Display
const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
};

document.addEventListener('DOMContentLoaded', () => {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle && drawer) {
        menuToggle.addEventListener('click', (e) => { e.stopPropagation(); drawer.classList.add('open'); overlay.classList.add('open'); });
        overlay.addEventListener('click', () => { drawer.classList.remove('open'); overlay.classList.remove('open'); });
    }
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) { themeBtn.onclick = () => { document.body.classList.toggle('dark-mode'); }; }
    
    if (document.getElementById('grid-limpias')) cargarDatos();
});

// Dashboard
async function cargarDatos() {
    if (!document.getElementById('grid-limpias')) return;

    const [habitaciones, registros] = await Promise.all([
        _supabase.from('habitaciones').select('*').order('nro_pieza'),
        _supabase.from('registros').select('*, habitaciones(nro_pieza)').is('salida', null).order('entrada', { ascending: true })
    ]);

    document.getElementById('grid-limpias').innerHTML = habitaciones.data
        .filter(h => h.estado === 'limpia')
        .map(h => `<div class="circulo limpia">${h.nro_pieza}</div>`).join('');
    
    document.getElementById('grid-sucias').innerHTML = habitaciones.data
        .filter(h => h.estado === 'sucia')
        .map(h => `<div class="circulo sucia" onclick="abrirConfirmacionLimpieza('${h.id}', '${h.nro_pieza}')">${h.nro_pieza}</div>`).join('');

    document.getElementById('lista-ocupadas').innerHTML = registros.data.map(r => `
        <div class="card-ocupada">
            <div><strong>Pza ${r.habitaciones.nro_pieza}</strong> ${r.ac ? '❄️' : ''}<br>
            <small>Entrada: ${formatTime(r.entrada)}</small></div>
            <div>
                <button class="btn btn-accent btn-sm" onclick="abrirEditar('${r.id}', '${r.entrada}', ${r.habitaciones.nro_pieza}, ${r.ac})">✏️</button>
                <button class="btn btn-primary btn-sm" onclick="abrirSalida('${r.id}', '${r.habitaciones.nro_pieza}', '${r.entrada}', ${r.pago_adelantado}, ${r.ac})">SALIDA</button>
            </div>
        </div>
    `).join('');
}

// Consultar día
async function consultarFecha() {
    const fecha = document.getElementById('input-fecha-consulta').value;
    if (!fecha) return alert("Selecciona una fecha");
    
    // Obtenemos un rango amplio para asegurar que incluimos todo el día según UTC
    // Fetch records for the day +- 24h to be safe, then filter in JS
    const { data, error } = await _supabase.from('registros')
        .select('*, habitaciones(nro_pieza)')
        .not('salida', 'is', null);
        
    if (error) {
        console.error("Error al consultar:", error);
        return alert("Error en la consulta. Revisa la consola.");
    }
    
    // Filtramos en JS por fecha local
    const dataFiltrada = data.filter(r => {
        const d = new Date(r.salida);
        return d.toLocaleDateString('en-CA') === fecha; // YYYY-MM-DD
    });
    
    const res = document.getElementById('resultado-consulta');
    if (dataFiltrada.length === 0) return res.innerHTML = "No hay registros.";
    
    let html = `<table style="width:100%; border-collapse: collapse; font-size: 14px;"><tr style="background:#ddd"><th>Pza</th><th>Entrada</th><th>Salida</th><th>Total</th><th>Acción</th></tr>`;
    let total = 0;
    dataFiltrada.forEach(r => {
        total += parseFloat(r.monto_total || 0);
        html += `<tr style="border-bottom: 1px solid #ccc;">
            <td style="padding:5px">${r.habitaciones.nro_pieza}</td>
            <td style="padding:5px">${formatTime(r.entrada)}</td>
            <td style="padding:5px">${formatTime(r.salida)}</td>
            <td style="padding:5px">${parseFloat(r.monto_total).toFixed(2)}</td>
            <td style="padding:5px"><button class="btn btn-danger btn-sm" onclick="eliminarRegistroDia('${r.id}')">Eliminar</button></td>
        </tr>`;
    });
    res.innerHTML = html + `</table><h3 style="text-align:right">Total: ${total.toFixed(2)}</h3>`;
    document.getElementById('btn-pdf-consultar').style.display = 'inline-block';
    window.reporteData = dataFiltrada;
}

// Reportes (Rango)
async function generarReporte() {
    const inicio = document.getElementById('fecha-inicio').value;
    const fin = document.getElementById('fecha-fin').value;
    if (!inicio || !fin) return alert("Selecciona rango de fechas");
    
    const { data, error } = await _supabase.from('registros')
        .select('*, habitaciones(nro_pieza)')
        .not('salida', 'is', null);
        
    if (error) return console.error(error);
    
    const dataFiltrada = data.filter(r => {
        const d = new Date(r.salida).toISOString().split('T')[0];
        return d >= inicio && d <= fin;
    });
    
    const res = document.getElementById('resultado-reporte');
    if (dataFiltrada.length === 0) return res.innerHTML = "No hay registros.";
    
    let html = `<table style="width:100%; border-collapse: collapse; font-size: 14px;"><tr style="background:#ddd"><th>Pza</th><th>Entrada</th><th>Salida</th><th>Total</th></tr>`;
    let total = 0;
    dataFiltrada.forEach(r => {
        total += parseFloat(r.monto_total || 0);
        html += `<tr style="border-bottom: 1px solid #ccc;"><td style="padding:5px">${r.habitaciones.nro_pieza}</td><td style="padding:5px">${formatTime(r.entrada)}</td><td style="padding:5px">${formatTime(r.salida)}</td><td style="padding:5px">${parseFloat(r.monto_total).toFixed(2)}</td></tr>`;
    });
    res.innerHTML = html + `</table><h3 style="text-align:right">Total: ${total.toFixed(2)}</h3>`;
    document.getElementById('btn-pdf').style.display = 'inline-block';
    window.reporteData = dataFiltrada;
}

async function eliminarRegistroDia(id) {
    if (!confirm("¿Seguro que quieres eliminar este registro?")) return;
    await _supabase.from('registros').delete().eq('id', id);
    consultarFecha(); 
}

// Reportes (Rango)
async function generarReporte() {
    const inicio = document.getElementById('fecha-inicio').value;
    const fin = document.getElementById('fecha-fin').value;
    if (!inicio || !fin) return alert("Selecciona rango de fechas");
    
    const { data, error } = await _supabase.from('registros')
        .select('*, habitaciones(nro_pieza)')
        .not('salida', 'is', null);
        
    if (error) return console.error(error);
    
    // Filtramos usando fecha local
    const dataFiltrada = data.filter(r => {
        const d = new Date(r.salida).toLocaleDateString('en-CA');
        return d >= inicio && d <= fin;
    });
    
    const res = document.getElementById('resultado-reporte');
    if (dataFiltrada.length === 0) return res.innerHTML = "No hay registros.";
    
    let html = `<table style="width:100%; border-collapse: collapse; font-size: 14px;"><tr style="background:#ddd"><th>Pza</th><th>Entrada</th><th>Salida</th><th>Total</th></tr>`;
    let total = 0;
    dataFiltrada.forEach(r => {
        total += parseFloat(r.monto_total || 0);
        html += `<tr style="border-bottom: 1px solid #ccc;"><td style="padding:5px">${r.habitaciones.nro_pieza}</td><td style="padding:5px">${formatTime(r.entrada)}</td><td style="padding:5px">${formatTime(r.salida)}</td><td style="padding:5px">${parseFloat(r.monto_total).toFixed(2)}</td></tr>`;
    });
    res.innerHTML = html + `</table><h3 style="text-align:right">Total: ${total.toFixed(2)}</h3>`;
    document.getElementById('btn-pdf').style.display = 'inline-block';
    window.reporteData = dataFiltrada;
}

function exportarPDF() {
    if(!window.reporteData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Reporte", 10, 10);
    doc.autoTable({ head: [['Pza', 'Entrada', 'Salida', 'Total']], body: window.reporteData.map(r => [r.habitaciones.nro_pieza, formatTime(r.entrada), formatTime(r.salida), r.monto_total]) });
    doc.save("reporte.pdf");
}

function exportarPDFConsultar() {
    if(!window.reporteData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Reporte Diario", 10, 10);
    doc.autoTable({ head: [['Pza', 'Entrada', 'Salida', 'Total']], body: window.reporteData.map(r => [r.habitaciones.nro_pieza, formatTime(r.entrada), formatTime(r.salida), r.monto_total]) });
    doc.save("reporte_dia.pdf");
}

// Lógica de Salida/Edición/Entrada
function recalcularSalida(entradaStr, adelanto, ac) {
    const entrada = new Date(entradaStr);
    const salida = new Date();
    let diffMin = Math.floor((salida - entrada) / 60000);
    if (diffMin < 0) diffMin = 0;
    let horas = Math.floor(diffMin / 60);
    let minutos = diffMin % 60;
    let costoHab = 0;
    if (ac == 1 || ac == true) {
        if (diffMin <= 76) costoHab = 35; 
        else {
            costoHab = horas * 30; 
            if (minutos >= 24) costoHab += 30; 
            else if (minutos >= 17) costoHab += 15;
        }
    } else {
        if (horas === 0 && minutos === 0) costoHab = 0;
        else if (horas === 0) costoHab = 30; 
        else {
            costoHab = 30; 
            let horasExtras = horas - 1;
            costoHab += horasExtras * 20; 
            if (minutos >= 24) costoHab += 20;
            else if (minutos >= 17) costoHab += 10;
        }
    }
    let totalPagar = costoHab - adelanto;
    if (totalPagar < 0) totalPagar = 0;
    document.getElementById('m-tiempo').innerText = `${horas}h ${minutos}m`;
    document.getElementById('m-total').innerText = totalPagar.toFixed(2);
}

let registroActual = null;
function abrirSalida(id, nro, entrada, adelanto, ac) {
    registroActual = { id, entrada, adelanto, ac };
    document.getElementById('m-titulo').innerText = nro;
    document.getElementById('m-entrada').innerText = formatTime(entrada);
    recalcularSalida(entrada, adelanto, ac);
    document.getElementById('modalSalida').showModal();
}

async function procesarSalida() {
    const { id } = registroActual;
    const total = parseFloat(document.getElementById('m-total').innerText);
    const { data: reg } = await _supabase.from('registros').select('habitacion_id').eq('id', id).single();
    await _supabase.from('habitaciones').update({ estado: 'sucia' }).eq('id', reg.habitacion_id);
    await _supabase.from('registros').update({ salida: new Date().toISOString(), monto_total: total }).eq('id', id);
    document.getElementById('modalSalida').close();
    cargarDatos();
}

function abrirEditar(id, entrada, nro, ac) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-old-nro').value = nro;
    document.getElementById('edit-nro').value = nro;
    document.getElementById('edit-ac').checked = ac;
    const d = new Date(entrada);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    document.getElementById('edit-entrada').value = d.toISOString().slice(0, 16);
    document.getElementById('modalEditar').showModal();
}

async function guardarEdicion() {
    const id = document.getElementById('edit-id').value;
    const oldNro = document.getElementById('edit-old-nro').value;
    const newNro = document.getElementById('edit-nro').value;
    const ac = document.getElementById('edit-ac').checked;
    const entrada = document.getElementById('edit-entrada').value;
    if (oldNro != newNro) {
        const { data: oldHab } = await _supabase.from('habitaciones').select('id').eq('nro_pieza', oldNro).single();
        const { data: newHab } = await _supabase.from('habitaciones').select('id, estado').eq('nro_pieza', newNro).single();
        if (newHab.estado !== 'limpia') return alert("Nueva habitación no está limpia");
        await _supabase.from('habitaciones').update({ estado: 'sucia' }).eq('id', oldHab.id);
        await _supabase.from('habitaciones').update({ estado: 'ocupada' }).eq('id', newHab.id);
        await _supabase.from('registros').update({ habitacion_id: newHab.id, ac: ac, entrada: new Date(entrada).toISOString() }).eq('id', id);
    } else {
        await _supabase.from('registros').update({ ac: ac, entrada: new Date(entrada).toISOString() }).eq('id', id);
    }
    document.getElementById('modalEditar').close();
    cargarDatos();
}

async function eliminarRegistro() {
    if (!confirm("¿Seguro que quieres eliminar este registro?")) return;
    const id = document.getElementById('edit-id').value;
    const { data: reg } = await _supabase.from('registros').select('habitacion_id').eq('id', id).single();
    await _supabase.from('habitaciones').update({ estado: 'limpia' }).eq('id', reg.habitacion_id);
    await _supabase.from('registros').delete().eq('id', id);
    document.getElementById('modalEditar').close();
    cargarDatos();
}

async function registrarEntrada() {
    const nro = document.getElementById('nroPza').value;
    const { data: hab } = await _supabase.from('habitaciones').select('id, estado').eq('nro_pieza', nro).single();
    if(!hab || hab.estado !== 'limpia') return alert("Habitación no disponible");
    await _supabase.from('habitaciones').update({ estado: 'ocupada' }).eq('id', hab.id);
    await _supabase.from('registros').insert([{ habitacion_id: hab.id, pago_adelantado: document.getElementById('adelanto').value, ac: document.getElementById('acCheck').checked }]);
    cargarDatos();
}

function abrirConfirmacionLimpieza(id, nro) {
    document.getElementById('limp-id').value = id;
    document.getElementById('limp-nro').innerText = nro;
    document.getElementById('modalLimpieza').showModal();
}

async function confirmarLimpieza() {
    const id = document.getElementById('limp-id').value;
    await _supabase.from('habitaciones').update({ estado: 'limpia' }).eq('id', id);
    document.getElementById('modalLimpieza').close();
    cargarDatos();
}
