const SUPABASE_URL = 'https://nxaqzhmojgydoyhpbzfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_S99rfoTFEw3IEWpRqdRdUg_RG_cES_D';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Formatting (Local Timezone Display)
const formatTime = (dateStr) => {
    // Convert UTC string to Date object
    const d = new Date(dateStr);
    // Display in local time
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
};



document.addEventListener('DOMContentLoaded', () => {
    // 1. REVISAR SI EL MODO OSCURO ESTABA GUARDADO
    if (localStorage.getItem('dark-mode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    const menuToggle = document.getElementById('menu-toggle');
    
    if (menuToggle && drawer) {
        menuToggle.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            drawer.classList.add('open'); 
            overlay.classList.add('open'); 
        });
        overlay.addEventListener('click', () => { 
            drawer.classList.remove('open'); 
            overlay.classList.remove('open'); 
        });
    }

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) { 
        themeBtn.onclick = () => { 
            // 2. CAMBIAR Y GUARDAR EL ESTADO EN EL NAVEGADOR
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('dark-mode', isDark);
        }; 
    }
    
    if (document.getElementById('grid-limpias')) cargarDatos();
    if (document.getElementById('resultado-consulta')) consultarFecha();
});




// Dashboard
async function cargarDatos() {
    if (!document.getElementById('grid-limpias')) return;

    // 1. Efecto visual de "Cargando..." antes de pedir los datos
    const cargandoHTML = `<div class="animate__animated animate__fadeIn animate__infinite" style="padding:10px; color:var(--text-muted); font-size:0.8rem;">⌛ Cargando...</div>`;
    
    document.getElementById('grid-limpias').innerHTML = cargandoHTML;
    document.getElementById('grid-sucias').innerHTML = cargandoHTML;
    document.getElementById('lista-ocupadas').innerHTML = cargandoHTML;

    try {
        const [habitaciones, registros] = await Promise.all([
            _supabase.from('habitaciones').select('*').order('nro_pieza'),
            _supabase.from('registros').select('*, habitaciones(nro_pieza)').is('salida', null).order('entrada', { ascending: true })
        ]);

        // 2. Renderizar Limpias
        const limpias = habitaciones.data.filter(h => h.estado === 'limpia');
        document.getElementById('grid-limpias').innerHTML = limpias.length > 0 
            ? limpias.map(h => `<div class="circulo limpia animate__animated animate__fadeIn">${h.nro_pieza}</div>`).join('')
            : '<small></small>';
        
        // 3. Renderizar Sucias
        const sucias = habitaciones.data.filter(h => h.estado === 'sucia');
        document.getElementById('grid-sucias').innerHTML = sucias.length > 0
            ? sucias.map(h => `<div class="circulo sucia animate__animated animate__fadeIn" onclick="abrirConfirmacionLimpieza('${h.id}', '${h.nro_pieza}')">${h.nro_pieza}</div>`).join('')
            : '<small></small>';

        // 4. Renderizar Ocupadas
        document.getElementById('lista-ocupadas').innerHTML = registros.data.length > 0
            ? registros.data.map(r => `
                <div class="card-ocupada animate__animated animate__slideInLeft">
                    <div><strong>Pza ${r.habitaciones.nro_pieza}</strong> ${r.ac ? '❄️❄️' : ''}<br>
                    <small>Entrada: ${formatTime(r.entrada)}</small></div>
                    <div style="${r.pago_adelantado > 0 ? 'color: var(--limpia);' : 'color: var(--sucia);'} font-size: 0.8rem;">Pagado: ${parseFloat(r.pago_adelantado).toFixed(2)}bs</div>
                    <div>
                        <button class="btn btn-accent btn-sm" onclick="abrirEditar('${r.id}', '${r.entrada}', ${r.habitaciones.nro_pieza}, ${r.ac}, ${r.pago_adelantado})">✏️</button>
                        <button class="btn btn-primary btn-sm" onclick="abrirSalida('${r.id}', '${r.habitaciones.nro_pieza}', '${r.entrada}', ${r.pago_adelantado}, ${r.ac})">SALIDA</button>
                    </div>
                </div>
            `).join('')
            : '<p style="text-align:center; padding:10px; color:var(--text-muted);">No hay piezas ocupadas</p>';

    } catch (err) {
        console.error(err);
        document.getElementById('grid-limpias').innerHTML = "Error al cargar";
    }
}





async function consultarFecha() {
    const fecha = new Date().toLocaleDateString('en-CA');
    const tituloEl = document.getElementById('titulo-fecha-consulta');
    if (tituloEl) {
        const fechaLegible = new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
        tituloEl.innerText = fechaLegible.charAt(0).toUpperCase() + fechaLegible.slice(1);
    }
    
    const { data, error } = await _supabase.from('registros')
        .select('*, habitaciones(nro_pieza)')
        .not('salida', 'is', null)
        .order('entrada', { ascending: true });
        
    if (error) return console.error(error);
    
    const dataFiltrada = data.filter(r => new Date(r.entrada).toLocaleDateString('en-CA') === fecha);
    
    const res = document.getElementById('resultado-consulta');
    if (!res) return;
    if (dataFiltrada.length === 0) return res.innerHTML = "<p style='padding:16px;text-align:center;color:var(--text-muted)'>No hay registros hoy.</p>";
    
    // 1. Cabecera simplificada (sin la columna Adelanto)
    let html = `<table style="width:100%; border-collapse: collapse; font-size: 14px;">
        <tr><th>Pza</th><th>Entrada</th><th>Salida</th><th>Total Cobrado</th><th></th></tr>`;
    
    let totalDia = 0;

    dataFiltrada.forEach(r => {
        const montoSalida = parseFloat(r.monto_total || 0);
        const adelanto = parseFloat(r.pago_adelantado || 0);
        
        // 2. Sumamos ambos para mostrar el ingreso real de esa habitación
        const ingresoHabitacion = montoSalida + adelanto; 
        totalDia += ingresoHabitacion; 

        html += `<tr>
            <td>${r.habitaciones.nro_pieza}</td>
            <td>${formatTime(r.entrada)}</td>
            <td>${formatTime(r.salida)}</td>
            <td><strong>${ingresoHabitacion.toFixed(2)} bs</strong></td>
            <td style="display:flex;flex-direction:column;gap:4px;padding:6px 4px;">
                <button class="btn btn-accent btn-sm" onclick="abrirEditarDia('${r.id}','${r.entrada}','${r.salida}',${r.monto_total})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarRegistroDia('${r.id}')">🗑</button>
            </td>
        </tr>`;
    });

    // 3. El total del día ahora refleja la suma de todos los ingresos reales
    res.innerHTML = html + `</table><h3 style="text-align:right; color:var(--limpia)">Total del día: ${totalDia.toFixed(2)} bs</h3>`;
    
    const btnPdf = document.getElementById('btn-pdf-consultar');
    if (btnPdf) btnPdf.style.display = 'inline-block';
    window.reporteData = dataFiltrada;
}






function abrirEditarDia(id, entrada, salida, total) {
    document.getElementById('edia-id').value = id;
    // Entrada
    const dEnt = new Date(entrada);
    let hEnt = dEnt.getHours(), mEnt = dEnt.getMinutes();
    const ampmEnt = hEnt >= 12 ? 'PM' : 'AM';
    hEnt = hEnt % 12 || 12;
    document.getElementById('edia-entrada-h').value = hEnt;
    document.getElementById('edia-entrada-m').value = String(mEnt).padStart(2,'0');
    document.getElementById('edia-entrada-ampm').value = ampmEnt;
    // Salida
    const dSal = new Date(salida);
    let hSal = dSal.getHours(), mSal = dSal.getMinutes();
    const ampmSal = hSal >= 12 ? 'PM' : 'AM';
    hSal = hSal % 12 || 12;
    document.getElementById('edia-salida-h').value = hSal;
    document.getElementById('edia-salida-m').value = String(mSal).padStart(2,'0');
    document.getElementById('edia-salida-ampm').value = ampmSal;
    // Total
    document.getElementById('edia-total').value = parseFloat(total).toFixed(2);
    document.getElementById('modalEditarDia').showModal();
}






// esto es de editar de consultardia.html
async function guardarEdicionDia() {
    // --- 1. LIMPIEZA PREVIA (Adiós error de consola) ---
    if (document.activeElement) document.activeElement.blur();
    const modal = document.getElementById('modalEditarDia');
    if (modal) modal.close();

    // --- 2. AHORA LANZAMOS EL CARGANDO ---
    Swal.fire({
        title: 'Guardando cambios...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });

    const id = document.getElementById('edia-id').value;
    
    // Lógica de horas (se mantiene intacta)
    let hEnt = parseInt(document.getElementById('edia-entrada-h').value) || 0;
    const mEnt = parseInt(document.getElementById('edia-entrada-m').value) || 0;
    const ampmEnt = document.getElementById('edia-entrada-ampm').value;
    let h24Ent = hEnt % 12; if (ampmEnt === 'PM') h24Ent += 12;

    let hSal = parseInt(document.getElementById('edia-salida-h').value) || 0;
    const mSal = parseInt(document.getElementById('edia-salida-m').value) || 0;
    const ampmSal = document.getElementById('edia-salida-ampm').value;
    let h24Sal = hSal % 12; if (ampmSal === 'PM') h24Sal += 12;

    const total = parseFloat(document.getElementById('edia-total').value) || 0;
    const hoy = new Date().toLocaleDateString('en-CA');
    const entradaISO = new Date(`${hoy}T${String(h24Ent).padStart(2,'0')}:${String(mEnt).padStart(2,'0')}:00`).toISOString();
    const salidaISO  = new Date(`${hoy}T${String(h24Sal).padStart(2,'0')}:${String(mSal).padStart(2,'0')}:00`).toISOString();

    try {
        await _supabase.from('registros')
            .update({ entrada: entradaISO, salida: salidaISO, monto_total: total })
            .eq('id', id);

        // Refrescamos la tabla del historial
        consultarFecha();

        // --- 3. EL MINI-ZAZ DE ÉXITO ---
        Swal.fire({
            title: 'CAMBIO GUARDADO',
            html: `<div style="font-size: 2.5rem;">📝✨</div>`,
            width: '280px',
            timer: 1500,
            showConfirmButton: false,
            showClass: {
                popup: 'animate__animated animate__fadeInRight'
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutLeft'
            },
            background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
        });

    } catch (err) {
        console.error(err);
        Swal.fire({ 
            icon: 'error', 
            title: 'Error al editar', 
            width: '300px',
            background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
        });
    }
}






//es el elminar de cosultardia.html
async function eliminarRegistroDia(id) {
    // 1. Quitar foco para evitar errores de consola
    if (document.activeElement) document.activeElement.blur();

    // 2. Confirmación elegante con SweetAlert
    const result = await Swal.fire({
        title: '¿BORRAR REGISTRO?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6e7881',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        width: '320px',
        showClass: {
            popup: 'animate__animated animate__shakeX' // Sacudida de advertencia
        },
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });

    if (!result.isConfirmed) return;

    // 3. Bloqueo de carga mientras borra en Supabase
    Swal.fire({
        title: 'Eliminando...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });

    try {
        await _supabase.from('registros').delete().eq('id', id);
        
        // Refrescamos la tabla del historial
        consultarFecha();

        // 4. EL MINI-ZAZ DE BORRADO
        Swal.fire({
            title: 'ELIMINADO',
            html: `<div style="font-size: 2.5rem;">🗑️✨</div>`,
            width: '280px',
            timer: 1500,
            showConfirmButton: false,
            showClass: {
                popup: 'animate__animated animate__fadeOutDown' // Se desvanece hacia abajo
            },
            background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
        });

    } catch (err) {
        console.error(err);
        Swal.fire({ 
            icon: 'error', 
            title: 'Error al eliminar', 
            width: '300px' 
        });
    }
}






async function generarReporte() {
    const inicio = document.getElementById('fecha-inicio').value;
    const fin = document.getElementById('fecha-fin').value;
    if (!inicio || !fin) return alert("Selecciona rango de fechas");
    
    const { data, error } = await _supabase.from('registros')
        .select('*, habitaciones(nro_pieza)')
        .not('salida', 'is', null)
        .order('entrada', { ascending: true });
        
    if (error) return console.error(error);
    
    // Filtrar el mes completo
    datosReporteGlobal = data.filter(r => {
        const d = new Date(r.entrada).toLocaleDateString('en-CA');
        return d >= inicio && d <= fin;
    });

    if (datosReporteGlobal.length === 0) {
        document.getElementById('resultado-reporte').innerHTML = "No hay registros.";
        return;
    }

    // Extraer qué días únicos hay en esos datos
    fechasDisponibles = [...new Set(datosReporteGlobal.map(r => 
        new Date(r.entrada).toLocaleDateString('en-CA')
    ))];
    
    indiceFechaActual = 0; 
    mostrarDiaEnReporte();
}




function mostrarDiaEnReporte() {
    const res = document.getElementById('resultado-reporte');
    const fechaISO = fechasDisponibles[indiceFechaActual];
    const registrosDelDia = datosReporteGlobal.filter(r => 
        new Date(r.entrada).toLocaleDateString('en-CA') === fechaISO
    );

    // Calcular Totales
    let subtotalDia = 0;
    let totalMes = datosReporteGlobal.reduce((acc, r) => 
        acc + (parseFloat(r.monto_total || 0) + parseFloat(r.pago_adelantado || 0)), 0
    );

    // Formatear fecha para el título (ej: Lunes 01 de Abril)
    const fechaLegible = new Date(fechaISO + "T00:00:00").toLocaleDateString('es-ES', { 
        weekday:'long', day:'numeric', month:'long' 
    });

    let html = `
        <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 15px; background: #eee; padding: 10px; border-radius: 8px;">
            <button class="btn btn-sm" onclick="cambiarDia(-1)" ${indiceFechaActual === 0 ? 'disabled' : ''}>⬅️ Ant.</button>
            <strong style="text-transform: uppercase;">${fechaLegible}</strong>
            <button class="btn btn-sm" onclick="cambiarDia(1)" ${indiceFechaActual === fechasDisponibles.length - 1 ? 'disabled' : ''}>Sig. ➡️</button>
        </div>
        
        <table style="width:100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 2px solid #ddd;"><th>Pza</th><th>Entrada</th><th>Salida</th><th>Total</th></tr>`;

    registrosDelDia.forEach(r => {
        const totalHab = parseFloat(r.monto_total || 0) + parseFloat(r.pago_adelantado || 0);
        subtotalDia += totalHab;
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:10px">${r.habitaciones.nro_pieza}</td>
                <td>${formatTime(r.entrada)}</td>
                <td>${formatTime(r.salida)}</td>
                <td><strong>${totalHab.toFixed(2)}</strong></td>
            </tr>`;
    });

    html += `</table>
        <div style="margin-top: 15px; text-align: right;">
            <p>Subtotal del día: <strong>${subtotalDia.toFixed(2)} bs</strong></p>
            <hr>
            <br>
            <h2 style="color: var(--limpia); margin-top: 5px;">Total: ${totalMes.toFixed(2)} bs</h2>
        </div>`;

    res.innerHTML = html;
    document.getElementById('btn-pdf').style.display = 'inline-block';
    window.reporteData = datosReporteGlobal; // Para que el PDF siga imprimiendo TODO el mes
}





function cambiarDia(direccion) {
    indiceFechaActual += direccion;
    mostrarDiaEnReporte();
}





// Export PDF / Helpers / Logic
function exportarPDF() {
    if (!window.reporteData || window.reporteData.length === 0) return alert("No hay datos para exportar");

    // --- AVISO DE INICIO ---
    Swal.fire({
        title: 'Generando PDF...',
        text: 'Preparando tablas y cálculos',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const totalClientes = window.reporteData.length;
    const clientesAC = window.reporteData.filter(r => r.ac).length;
    const granTotal = window.reporteData.reduce((acc, r) => 
        acc + (parseFloat(r.monto_total || 0) + parseFloat(r.pago_adelantado || 0)), 0
    );

    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("REPORTE OPERATIVO - MOTEL", 14, 18);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Periodo consultado: ${document.getElementById('fecha-inicio').value} al ${document.getElementById('fecha-fin').value}`, 14, 25);

    // Cuadritos del Dashboard
    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, 30, 55, 22, 2, 2, 'FD');
    doc.setTextColor(60); doc.setFontSize(8); doc.text("TOTAL CLIENTES", 18, 36);
    doc.setFontSize(13); doc.text(`${totalClientes} pers.`, 18, 45);

    doc.setFillColor(230, 240, 255);
    doc.roundedRect(75, 30, 55, 22, 2, 2, 'FD');
    doc.setTextColor(0, 80, 160); doc.setFontSize(8); doc.text("USO DE AIRE (A/C)", 79, 36);
    doc.setFontSize(13); doc.text(`${clientesAC} serv.`, 79, 45);

    doc.setFillColor(230, 250, 230);
    doc.roundedRect(136, 30, 60, 22, 2, 2, 'FD');
    doc.setTextColor(0, 100, 0); doc.setFontSize(8); doc.text("TOTAL RECAUDADO", 140, 36);
    doc.setFontSize(13); doc.text(`${granTotal.toFixed(2)} bs`, 140, 45);

    const grupos = {};
    window.reporteData.forEach(r => {
        const fecha = new Date(r.entrada).toLocaleDateString('es-ES', { 
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
        });
        if (!grupos[fecha]) grupos[fecha] = [];
        grupos[fecha].push(r);
    });

    const rows = [];
    for (const fecha in grupos) {
        rows.push([{ content: fecha.toUpperCase(), colSpan: 5, styles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold', halign: 'center' } }]);
        grupos[fecha].forEach(r => {
            const totalHab = parseFloat(r.monto_total || 0) + parseFloat(r.pago_adelantado || 0);
            rows.push([`Pieza ${r.habitaciones.nro_pieza}`, formatTime(r.entrada), formatTime(r.salida), r.ac ? "SI (AC)" : "NO", `${totalHab.toFixed(2)} bs`]);
        });
    }

    doc.autoTable({
        startY: 60,
        head: [['Habitacion', 'Entrada', 'Salida', 'Aire', 'Cobro']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [70, 70, 70], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' }, 3: { halign: 'center' }, 0: { fontStyle: 'bold' } },
        margin: { top: 60 } 
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text("* (AC) indica que se aplicó tarifa con Aire Acondicionado.", 14, finalY);

    const nombreArchivo = `Reporte_${document.getElementById('fecha-inicio').value}_al_${document.getElementById('fecha-fin').value}.pdf`;
    doc.save(nombreArchivo);

    // --- ÉXITO FINAL ---
    Swal.fire({
        title: 'PDF CREADO',
        html: '<div style="font-size: 3rem;">📄✨</div><p>Reporte descargado con éxito</p>',
        width: '300px',
        timer: 2000,
        showConfirmButton: false,
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });
}





// PDF PARA DIARIO------------------------------------------------
function exportarPDFConsultar() {
    if (!window.reporteData || window.reporteData.length === 0) return alert("No hay datos hoy");

    // --- AVISO MINI ---
    Swal.fire({
        title: 'Creando Cierre...',
        width: '250px',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const fechaHoy = new Date().toLocaleDateString('es-ES', { 
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
    const totalClientes = window.reporteData.length;
    const clientesAC = window.reporteData.filter(r => r.ac).length;
    const granTotal = window.reporteData.reduce((acc, r) => 
        acc + (parseFloat(r.monto_total || 0) + parseFloat(r.pago_adelantado || 0)), 0
    );

    doc.setFontSize(16); doc.setTextColor(40); doc.text("CIERRE DE CAJA DIARIO", 14, 15);
    doc.setFontSize(10); doc.setTextColor(100); doc.text(fechaHoy.toUpperCase(), 14, 22);

    doc.setFillColor(240, 240, 240); doc.roundedRect(14, 28, 40, 18, 2, 2, 'F');
    doc.setFontSize(7); doc.text("CLIENTES", 18, 33); doc.setFontSize(11); doc.text(`${totalClientes}`, 18, 41);

    doc.setFillColor(230, 245, 255); doc.roundedRect(58, 28, 40, 18, 2, 2, 'F');
    doc.setTextColor(0, 100, 200); doc.setFontSize(7); doc.text("CON AIRE (AC)", 62, 33);
    doc.setFontSize(11); doc.text(`${clientesAC}`, 62, 41);

    doc.setFillColor(44, 62, 80); doc.roundedRect(102, 28, 94, 18, 2, 2, 'F');
    doc.setTextColor(255); doc.setFontSize(8); doc.text("TOTAL COBRADO EN CAJA", 108, 34);
    doc.setFontSize(12); doc.text(`${granTotal.toFixed(2)} bs`, 108, 42);

    const body = window.reporteData.map(r => {
        const totalReal = parseFloat(r.monto_total || 0) + parseFloat(r.pago_adelantado || 0);
        return [`Pza ${r.habitaciones.nro_pieza}`, formatTime(r.entrada), formatTime(r.salida), r.ac ? "SI (AC)" : "NO", `${totalReal.toFixed(2)} bs`];
    });

    doc.autoTable({
        startY: 55,
        head: [['Habitacion', 'Entrada', 'Salida', 'Aire', 'Total']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80], fontSize: 9 },
        styles: { fontSize: 9 },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' }, 3: { halign: 'center' } }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Corte impreso el: ${new Date().toLocaleTimeString()}`, 14, finalY);

    doc.save(`Cierre_Diario_${new Date().toLocaleDateString('en-CA')}.pdf`);

    // --- ÉXITO MINI ---
    Swal.fire({
        title: 'DESCARGA DE PLANILLA',
        html: '<div style="font-size: 2.3rem;">📁✅</div>',
        width: '280px',
        timer: 2000,
        showConfirmButton: false,
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });
}





function recalcularSalida(entradaStr, adelanto, ac) {
    const entrada = new Date(entradaStr);
    const salida = new Date();
    let diffMin = Math.floor((salida - entrada) / 60000);
    if (diffMin < 0) diffMin = 0;
    let horas = Math.floor(diffMin / 60);
    let minutos = diffMin % 60;
    let costoHab = calcularCosto(horas, minutos, diffMin, ac);
    let adelantoVal = parseFloat(adelanto) || 0;
    let totalPagar = Math.max(0, costoHab - adelantoVal);
    document.getElementById('m-tiempo').innerText = `${horas}h ${minutos}m`;
    document.getElementById('m-precio').innerText = costoHab.toFixed(2);
    document.getElementById('m-total').innerText = totalPagar.toFixed(2);
}




function recalcularSalidaConHora(entradaStr, adelanto, ac) {
    const h = parseInt(document.getElementById('m-salida-h').value) || 0;
    const m = parseInt(document.getElementById('m-salida-m').value) || 0;
    const ampm = document.getElementById('m-salida-ampm').value;
    let h24 = h % 12;
    if (ampm === 'PM') h24 += 12;
    const entrada = new Date(entradaStr);
    const salida = new Date();
    salida.setHours(h24, m, 0, 0);
    // If salida is before entrada, assume next day
    if (salida < entrada) salida.setDate(salida.getDate() + 1);
    let diffMin = Math.floor((salida - entrada) / 60000);
    if (diffMin < 0) diffMin = 0;
    let horas = Math.floor(diffMin / 60);
    let minutos = diffMin % 60;
    let costoHab = calcularCosto(horas, minutos, diffMin, ac);
    let adelantoVal = parseFloat(adelanto) || 0;
    let totalPagar = Math.max(0, costoHab - adelantoVal);
    document.getElementById('m-tiempo').innerText = `${horas}h ${minutos}m`;
    document.getElementById('m-precio').innerText = costoHab.toFixed(2);
    document.getElementById('m-total').innerText = totalPagar.toFixed(2);
}




function calcularCosto(horas, minutos, diffMin, ac) {
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
    return costoHab;
}

let registroActual = null;





function abrirSalida(id, nro, entrada, adelanto, ac) {
    registroActual = { id, entrada, adelanto, ac };
    document.getElementById('m-titulo').innerText = nro;
    document.getElementById('m-entrada').innerText = formatTime(entrada);
    document.getElementById('m-adelanto').innerText = parseFloat(adelanto).toFixed(2);
    // Set current time in AM/PM fields
    const ahora = new Date();
    let h = ahora.getHours();
    const m = ahora.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    document.getElementById('m-salida-h').value = h;
    document.getElementById('m-salida-m').value = String(m).padStart(2, '0');
    document.getElementById('m-salida-ampm').value = ampm;
    // Add listeners to recalculate on change
    ['m-salida-h','m-salida-m','m-salida-ampm'].forEach(id => {
        document.getElementById(id).oninput = () => recalcularSalidaConHora(entrada, adelanto, ac);
    });
    recalcularSalidaConHora(entrada, adelanto, ac);
    document.getElementById('modalSalida').showModal();
}





// Paso 1: Solo abre el modal de confirmación "bonito"
function procesarSalida() {
    const modalConf = document.getElementById('modalConfirmar');
    
    // Configuramos el clic del botón de SÍ una sola vez
    document.getElementById('btnConfirmarFinal').onclick = ejecutarDespacho;
    
    modalConf.showModal();
}





// Paso 2: La ejecución real (tu código original mejorado)
async function ejecutarDespacho() {
    const btn = document.getElementById('btnConfirmarFinal');
    
    // 1. Bloqueo visual inmediato
    btn.disabled = true; 
    btn.innerHTML = "⌛..."; 
    btn.style.opacity = "0.7";

    try {
        const { id } = registroActual;
        const total = parseFloat(document.getElementById('m-total').innerText);
        
        const h = parseInt(document.getElementById('m-salida-h').value) || 0;
        const m = parseInt(document.getElementById('m-salida-m').value) || 0;
        const ampm = document.getElementById('m-salida-ampm').value;
        let h24 = h % 12; if (ampm === 'PM') h24 += 12;

        const salidaDate = new Date();
        salidaDate.setHours(h24, m, 0, 0);

        // Operaciones en Supabase
        const { data: reg } = await _supabase.from('registros').select('habitacion_id').eq('id', id).single();
        
        await Promise.all([
            _supabase.from('habitaciones').update({ estado: 'sucia' }).eq('id', reg.habitacion_id),
            _supabase.from('registros').update({ salida: salidaDate.toISOString(), monto_total: total }).eq('id', id)
        ]);

        // 2. Cerrar modales (Limpiamos el foco para que SweetAlert no dé error)
        if(document.getElementById('modalConfirmar')) document.getElementById('modalConfirmar').close();
        if(document.getElementById('modalSalida')) document.getElementById('modalSalida').close();

        // Limpiar campos de texto
        ['m-titulo','m-entrada','m-adelanto','m-precio','m-tiempo','m-total'].forEach(i => {
            const el = document.getElementById(i);
            if(el) el.innerText = '';
        });

        cargarDatos();

        // --- EL "MINI-ZAZ" ANIMADO (Igual que registrar) ---
        Swal.fire({
            title: 'SALIDA REGISTRADA',
            html: `<div style="font-size: 3rem; margin-bottom:10px;">🚗💨</div>`, 
            width: '300px',
            timer: 2000,
            showConfirmButton: false,
            // AQUÍ ESTÁ EL MOVIMIENTO BONITO
            showClass: {
                popup: 'animate__animated animate__backInUp' // Entra rebotando desde abajo
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutDown' // Se va hacia abajo
            },
            background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
        });

        // 3. ARREGLO DEL BUG: Resetear el botón para la próxima pieza
        btn.disabled = false;
        btn.innerText = "SÍ, DESPACHAR";
        btn.style.opacity = "1";

    } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error', width: '300px' });
        
        // Reset en caso de error para no quedar bloqueado
        btn.disabled = false;
        btn.innerText = "SÍ, DESPACHAR";
        btn.style.opacity = "1";
    }
}






function abrirEditar(id, entrada, nro, ac, adelanto) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-old-nro').value = nro;
    document.getElementById('edit-nro').value = nro;
    document.getElementById('edit-ac').checked = ac;

    document.getElementById('edit-adelanto').value = adelanto || 0;

    const d = new Date(entrada);
    // Fecha
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    document.getElementById('edit-fecha').value = `${yyyy}-${mm}-${dd}`;
    // Hora AM/PM
    let h = d.getHours();
    const min = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    document.getElementById('edit-hora-h').value = h;
    document.getElementById('edit-hora-m').value = String(min).padStart(2,'0');
    document.getElementById('edit-hora-ampm').value = ampm;
    document.getElementById('modalEditar').showModal();
}






async function guardarEdicion() {
    const id = document.getElementById('edit-id').value;
    const oldNro = document.getElementById('edit-old-nro').value;
    const newNro = document.getElementById('edit-nro').value;
    const ac = document.getElementById('edit-ac').checked;

    const nuevoAdelanto = parseFloat(document.getElementById('edit-adelanto').value) || 0;

    const fecha = document.getElementById('edit-fecha').value;
    let h = parseInt(document.getElementById('edit-hora-h').value) || 0;
    const min = parseInt(document.getElementById('edit-hora-m').value) || 0;
    const ampm = document.getElementById('edit-hora-ampm').value;
    let h24 = h % 12;
    if (ampm === 'PM') h24 += 12;
    
    const entradaDate = new Date(`${fecha}T${String(h24).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`);
    const entrada = entradaDate.toISOString();

    // --- CORRECCIÓN DE DISEÑO (Liberar foco y cerrar modal antes) ---
    if (document.activeElement) document.activeElement.blur();
    const modalEditar = document.getElementById('modalEditar');
    if (modalEditar) modalEditar.close();

    // Ahora lanzamos el cargando sin conflicto de aria-hidden
    Swal.fire({
        title: 'Actualizando...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });

    try {
        if (oldNro != newNro) {
            const { data: oldHab } = await _supabase.from('habitaciones').select('id').eq('nro_pieza', oldNro).single();
            const { data: newHab } = await _supabase.from('habitaciones').select('id, estado').eq('nro_pieza', newNro).single();
            
            if (newHab.estado !== 'limpia') {
                return Swal.fire({ 
                    icon: 'error', 
                    title: 'Error', 
                    text: 'La nueva habitación no está limpia', 
                    width: '300px' 
                });
            }

            await _supabase.from('habitaciones').update({ estado: 'sucia' }).eq('id', oldHab.id);
            await _supabase.from('habitaciones').update({ estado: 'ocupada' }).eq('id', newHab.id);
            await _supabase.from('registros').update({ habitacion_id: newHab.id, ac: ac, entrada, pago_adelantado: nuevoAdelanto }).eq('id', id);
        } else {
            await _supabase.from('registros').update({ ac: ac, entrada, pago_adelantado: nuevoAdelanto }).eq('id', id);
        }

        // Refrescamos los datos del dashboard
        cargarDatos();

        // --- EL MINI-ZAZ DE EDICIÓN ---
        Swal.fire({
            title: 'EDITADO EXITOSAMENTE',
            html: `<div style="font-size: 2.5rem;">🔄✨</div>`,
            width: '300px',
            timer: 1500,
            showConfirmButton: false,
            showClass: {
                popup: 'animate__animated animate__flipInX'
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOut'
            },
            background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
        });

    } catch (err) {
        console.error(err);
        Swal.fire({ 
            icon: 'error', 
            title: 'Error al guardar', 
            width: '300px',
            background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
        });
    }
}






async function eliminarRegistro() {
    const modalEdicion = document.getElementById('modalEditar');
    
    // 1. CERRAR EL MODAL PRIMERO (Libera el foco y evita el error de consola)
    if (modalEdicion) modalEdicion.close();

    // 2. LANZAR LA ALERTA BONITA
    const result = await Swal.fire({
        title: '¿Eliminar Cliente?',
        text: "La pieza volverá a estar LIMPIA en el sistema.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6e7881',
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar',
        width: '320px',
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });

    // 3. SI EL USUARIO CANCELA, REABRIMOS EL MODAL (Opcional)
    if (!result.isConfirmed) {
        if (modalEdicion) modalEdicion.showModal();
        return;
    }

    // 4. SI CONFIRMA, PROCEDEMOS AL BORRADO
    try {
        const id = document.getElementById('edit-id').value;
        const { data: reg } = await _supabase.from('registros').select('habitacion_id').eq('id', id).single();
        
        await Promise.all([
            _supabase.from('habitaciones').update({ estado: 'limpia' }).eq('id', reg.habitacion_id),
            _supabase.from('registros').delete().eq('id', id)
        ]);
        
        cargarDatos();

        // Éxito mini
        Swal.fire({ 
            title: '¡BORRADO!', 
            html: '<div style="font-size: 2rem;">🗑️✨</div>',
            timer: 1000, 
            showConfirmButton: false, 
            width: '250px' 
        });

    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No se pudo eliminar', 'error');
    }
}








async function registrarEntrada() {
    const nro = document.getElementById('nroPza').value;
    if (!nro) return Swal.fire({ icon: 'warning', title: 'Falta Nro', width: '250px' });

    // 1. Mostrar carga mientras consultamos disponibilidad
    Swal.fire({
        title: 'Buscando pieza...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });

    const { data: hab } = await _supabase.from('habitaciones').select('id, estado').eq('nro_pieza', nro).single();
    
    if(!hab || hab.estado !== 'limpia') {
        return Swal.fire({ 
            icon: 'error', 
            title: 'No disponible', 
            text: 'La pieza está ocupada o sucia.',
            width: '300px' 
        });
    }

    const adelantoRaw = document.getElementById('adelanto').value;
    const adelanto = adelantoRaw === '' ? 0 : parseFloat(adelantoRaw);
    const tieneAC = document.getElementById('acCheck').checked;

    try {
        // 2. Ejecutar cambios en Supabase
        await Promise.all([
            _supabase.from('habitaciones').update({ estado: 'ocupada' }).eq('id', hab.id),
            _supabase.from('registros').insert([{ 
                habitacion_id: hab.id, 
                pago_adelantado: adelanto, 
                ac: tieneAC 
            }])
        ]);

        // 3. Limpiar formulario
        document.getElementById('nroPza').value = '';
        document.getElementById('adelanto').value = '0';
        document.getElementById('acCheck').checked = false;
        
        cargarDatos();

        // 4. EL ZAZ DE BIENVENIDA 💑
        Swal.fire({
            title: '¡INGRESADO!',
            html: `
                <div style="font-size: 3.5rem;">💑</div>
                <p style="margin-top:10px; font-weight:bold;">¡Buen turno!</p>
            `,
            width: '300px',
            timer: 2000,
            showConfirmButton: false,
            showClass: {
                popup: 'animate__animated animate__backInDown' 
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp'
            },
            background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
        });

    } catch (error) {
        Swal.fire('Error', 'No se pudo registrar: ' + error.message, 'error');
    }
}


function abrirConfirmacionLimpieza(id, nro) {
    document.getElementById('limp-id').value = id;
    document.getElementById('limp-nro').innerText = nro;
    document.getElementById('modalLimpieza').showModal();
}







async function confirmarLimpieza() {
    const id = document.getElementById('limp-id').value;
    const modal = document.getElementById('modalLimpieza');

    // 1. EL TRUCO: Quitarle el foco al botón que acabas de presionar
    if (document.activeElement) {
        document.activeElement.blur(); 
    }

    // 2. CERRAR EL MODAL DE INMEDIATO
    if (modal) modal.close();

    // 3. AHORA SÍ, LANZAR SWEETALERT
    // Ya no habrá error porque el botón ya no tiene el foco y el modal está cerrado
    Swal.fire({
        title: 'Actualizando...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        await _supabase.from('habitaciones').update({ estado: 'limpia' }).eq('id', id);
        
        cargarDatos();

        Swal.fire({
            title: 'PIEZA LIMPIA ✨',
            html: `<div style="font-size: 2.5rem;">🧼🧹</div>`,
            width: '280px',
            timer: 1500,
            showConfirmButton: false,
            showClass: { popup: 'animate__animated animate__zoomIn' },
            background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
        });

    } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error', width: '300px' });
    }
}
//codigo par gestion de dia---------------------------------========================
// 1. CARGAR LOS REGISTROS DEL DÍA SELECCIONADO
// --- FUNCIONES EXCLUSIVAS PARA GESTIÓN (No afectan a index.html) ---

/* === CÓDIGO EXCLUSIVO PARA PÁGINA DE GESTIÓN === */
/* === FUNCIONES EXCLUSIVAS PARA GESTIÓN === */

/* --- GESTIÓN SIMPLE: SOLO CAMBIA LAS HORAS QUE ESCRIBAS --- */
async function consultarFechaGestion() {
    const fecha = document.getElementById('fecha-gestion').value;
    if (!fecha) return alert("Selecciona una fecha");

    const { data, error } = await _supabase.from('registros')
        .select('*, habitaciones(nro_pieza)')
        .not('salida', 'is', null)
        .order('entrada', { ascending: true });

    if (error) return console.error(error);

    const filtrados = data.filter(r => new Date(r.entrada).toLocaleDateString('en-CA') === fecha);

    const res = document.getElementById('resultado-gestion');
    if (filtrados.length === 0) {
        res.innerHTML = "<p style='text-align:center;padding:20px;'>No hay registros para este día.</p>";
        return;
    }

    let totalDia = 0;

    let html = `<table style="width:100%; border-collapse: collapse; font-size: 14px; margin-top:20px;">
        <tr style="background:var(--bg-card); border-bottom:2px solid #ddd;">
            <th>Pza</th><th>Entrada</th><th>Salida</th><th>Total</th><th>Acción</th>
        </tr>`;

    filtrados.forEach(r => {
        const monto = parseFloat(r.monto_total || 0) + parseFloat(r.pago_adelantado || 0);
        totalDia += monto;

        html += `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding:10px"><b>${r.habitaciones.nro_pieza}</b></td>
            <td>${formatTime(r.entrada)}</td>
            <td>${formatTime(r.salida)}</td>
            <td>${monto.toFixed(2)}</td>
            <td style="display:flex; gap:5px; padding:5px; justify-content:center;">
                <button class="btn btn-accent btn-sm" onclick="abrirModalGestion('${r.id}','${r.entrada}','${r.salida}',${r.monto_total})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarRegistroGestion('${r.id}')">🗑</button>
            </td>
        </tr>`;
    });

    html += "</table>";

    // TOTAL VERDE SENCILLO AL FINAL
    const txtTotal = `
        <h3 style="color: #28a745; text-align: center; margin-top: 25px; font-weight: 900; font-size: 1.5rem;">
            TOTAL: ${totalDia.toFixed(2)} BS
        </h3>
    `;

    res.innerHTML = html + txtTotal;
}





function abrirModalGestion(id, entrada, salida, total) {
    document.getElementById('egest-id').value = id;
    document.getElementById('egest-total').value = total;

    const separar = (iso) => {
        const d = new Date(iso);
        let h = d.getHours();
        const m = d.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return { h, m, ampm };
    };

    const e = separar(entrada);
    document.getElementById('egest-entrada-h').value = e.h;
    document.getElementById('egest-entrada-m').value = e.m;
    document.getElementById('egest-entrada-ampm').value = e.ampm;

    const s = separar(salida);
    document.getElementById('egest-salida-h').value = s.h;
    document.getElementById('egest-salida-m').value = s.m;
    document.getElementById('egest-salida-ampm').value = s.ampm;

    document.getElementById('modalEditarGestion').showModal();
}





async function guardarEdicionGestion() {
    // --- 1. PREPARACIÓN Y LIMPIEZA DE CONSOLA ---
    if (document.activeElement) document.activeElement.blur();
    const modal = document.getElementById('modalEditarGestion');
    if (modal) modal.close();

    // Lanzamos el cargando mientras procesa
    Swal.fire({
        title: 'Actualizando registro...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });

    try {
        const id = document.getElementById('egest-id').value;
        
        // Obtenemos datos actuales
        const { data: reg } = await _supabase.from('registros').select('entrada, salida').eq('id', id).single();

        const construirISO = (isoOriginal, hMod, mMod, ampm) => {
            let d = new Date(isoOriginal);
            let h24 = parseInt(hMod) % 12;
            if (ampm === 'PM') h24 += 12;
            d.setHours(h24, parseInt(mMod), 0, 0);
            return d.toISOString();
        };

        const nEnt = construirISO(reg.entrada, 
            document.getElementById('egest-entrada-h').value, 
            document.getElementById('egest-entrada-m').value, 
            document.getElementById('egest-entrada-ampm').value);

        const nSal = construirISO(reg.salida, 
            document.getElementById('egest-salida-h').value, 
            document.getElementById('egest-salida-m').value, 
            document.getElementById('egest-salida-ampm').value);

        const nTot = parseFloat(document.getElementById('egest-total').value);

        // Guardado en Supabase
        await _supabase.from('registros').update({
            entrada: nEnt,
            salida: nSal,
            monto_total: nTot
        }).eq('id', id);

        // Refrescamos la tabla de gestión
        consultarFechaGestion();

        // --- 2. EL MINI-ZAZ DE ÉXITO ---
        Swal.fire({
            title: 'REGISTRO ACTUALIZADO',
            html: `<div style="font-size: 2.5rem;">💾✨</div>`,
            width: '300px',
            timer: 1500,
            showConfirmButton: false,
            showClass: {
                popup: 'animate__animated animate__fadeInDown'
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp'
            },
            background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
        });

    } catch (err) {
        console.error(err);
        Swal.fire({ 
            icon: 'error', 
            title: 'Error al actualizar', 
            width: '300px',
            background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
        });
    }
}



async function eliminarRegistroGestion(id) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir este cambio!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ffb129', // El naranja de tu app
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: document.body.classList.contains('dark-mode') ? '#1a1a1a' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000'
    });

    if (result.isConfirmed) {
        // Mostrar mini cargando mientras borra
        Swal.showLoading();
        
        const { error } = await _supabase.from('registros').delete().eq('id', id);
        
        if (!error) {
            Swal.fire({
                title: '¡Eliminado!',
                icon: 'success',
                timer: 1000,
                showConfirmButton: false
            });
            consultarFechaGestion();
        } else {
            Swal.fire('Error', 'No se pudo eliminar', 'error');
        }
    }
}









// ============================================================
// LÓGICA PARA INGRESO MANUAL (CUADERNO) - SOLO PARA GESTION.HTML
// ============================================================
// --- LÓGICA PARA INGRESO MANUAL (CUADERNO) ---

// 1. Llenar el selector con "Pza" en lugar de "Habitación"
if (document.getElementById('manual-hab')) {
    (async () => {
        const { data } = await _supabase.from('habitaciones').select('*').order('nro_pieza');
        const select = document.getElementById('manual-hab');
        if (data) {
            data.forEach(h => {
                let opt = document.createElement('option');
                opt.value = h.id;
                // CAMBIO: Ahora dice Pza en lugar de Habitación
                opt.textContent = "Pza " + h.nro_pieza; 
                select.appendChild(opt);
            });
        }
    })();
}

async function insertarDatoCuaderno() {
    const fechaBase = document.getElementById('fecha-gestion').value;
    if (!fechaBase) return alert("Selecciona la fecha arriba");

    const habId = document.getElementById('manual-hab').value;
    const total = document.getElementById('manual-total').value;
    const tieneAC = document.getElementById('manual-ac').checked;
    
    // Capturamos los valores directamente (vienen como "HH:MM")
    const hEntrada = document.getElementById('manual-ent-time').value;
    const hSalida = document.getElementById('manual-sal-time').value;

    if (!total || !hEntrada || !hSalida) return alert("Completa todos los campos");

    const construirISO = (hora24) => {
        const [anio, mes, dia] = fechaBase.split('-').map(Number);
        const [h, m] = hora24.split(':').map(Number);
        return new Date(anio, mes - 1, dia, h, m, 0).toISOString();
    };

    const entradaISO = construirISO(hEntrada);
    const salidaISO = construirISO(hSalida);

    const { error } = await _supabase.from('registros').insert([{
        habitacion_id: habId, 
        entrada: entradaISO,
        salida: salidaISO,
        monto_total: parseFloat(total),
        pago_adelantado: 0,
        ac: tieneAC
    }]);

    if (!error) {
        // Limpiamos todo para el siguiente "ZAZ"
        document.getElementById('manual-total').value = "";
        document.getElementById('manual-ent-time').value = "";
        document.getElementById('manual-sal-time').value = "";
        document.getElementById('manual-ac').checked = false;
        consultarFechaGestion(); 
    } else {
        alert("Error al guardar");
    }
}



// ===============================================================================
// --- SINCRONIZACIÓN TOTAL PARA EL PWA ---========================================
//================================================================================

// Escuchar cambios en Habitaciones (Limpieza/Sucia)
_supabase
  .channel('cambios-habitaciones')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'habitaciones' }, (payload) => {
      console.log('Cambio en habitación:', payload);
      cargarDatos(); 
  })
  .subscribe();

// Escuchar cambios en Registros (Nuevas entradas/Salidas)
_supabase
  .channel('cambios-registros')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, (payload) => {
      console.log('Cambio en registros:', payload);
      cargarDatos();
  })
  .subscribe();

  // ... (Tus bloques de Realtime que ya tenías) ...

// --- SOLUCIÓN PARA EL DESBLOQUEO DEL CELULAR ---
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Al desbloquear o volver a la pestaña, refrescamos todo
        window.location.reload();
    }
});