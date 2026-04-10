document.addEventListener('DOMContentLoaded', function () {

    //guardamos los id de la caja de resultado y el boton en constantes
    const calcularBoton = document.getElementById("calcularBtn");
    const cajaResultado = document.getElementById("resultado");

    //anadimos valores iniciales a los elementos del document
    document.getElementById("inputTarifa").value = 30;

    // Limitar a máximo 2 dígitos en los inputs numéricos
    ['horaEntrada', 'minutosEntrada', 'horaSalida', 'minutosSalida'].forEach(function(id) {
        const el = document.getElementById(id);
        el.addEventListener('input', function () {
            if (this.value.length > 2) {
                this.value = this.value.slice(0, 2);
            }
        });
    });

    //esto es para calcular los tiempos con el boton calcular
    calcularBoton.addEventListener('click', calcularTiempoCosto);

    //hacemos la funcion para calcular tiempo y costo
    function calcularTiempoCosto() {
        cajaResultado.style.display = 'none'; //ocultamos la caja de resultados
        //obtenemos los datos del document
        const horaEntrada = parseInt(document.getElementById("horaEntrada").value);
        const minutoEntrada = parseInt(document.getElementById("minutosEntrada").value);
        const periodoEntrada = document.getElementById("periodoEntrada").value;

        const horaSalida = parseInt(document.getElementById("horaSalida").value);
        const minutoSalida = parseInt(document.getElementById("minutosSalida").value);
        const periodoSalida = document.getElementById("periodoSalida").value;

        const tarifa = parseFloat(document.getElementById("inputTarifa").value);

        //convertimos el tiempo en 24 horas con la funcion para convertir
        const entrada24 = convertir24Horas(horaEntrada, minutoEntrada, periodoEntrada);
        const salida24 = convertir24Horas(horaSalida, minutoSalida, periodoSalida);

        //calcular minutos totales
        const calcMinutosEntrada = entrada24.horas * 60 + entrada24.minutos;
        let calcMinutosSalida = salida24.horas * 60 + salida24.minutos;

        //manejar el caso en que sea el dia siguiente:
        if ((salida24.horas < entrada24.horas) || (salida24.horas === entrada24.horas && salida24.minutos < entrada24.minutos)) {
            calcMinutosSalida = calcMinutosSalida + 24 * 60; //anado un dia de 24 horas
        }

        const minutosTotales = calcMinutosSalida - calcMinutosEntrada;

        //calculamos horas y minutos
        const horas = Math.floor(minutosTotales / 60);
        const minutos = minutosTotales % 60;

        //calcular costo
        const horasTotales = horas + (minutos / 60);
        const costo = calcularCostoEspecial(horas, minutos, tarifa);

        //formatear hora
        const formatoEntrada = formatearTiempo(horaEntrada, minutoEntrada, periodoEntrada.toUpperCase());
        const formatoSalida = formatearTiempo(horaSalida, minutoSalida, periodoSalida.toUpperCase());

        //mostramos resultados
        document.getElementById("hrEntradaR").textContent = formatoEntrada;
        document.getElementById("hrSalidaR").textContent = formatoSalida;
        document.getElementById("totalTiempoR").textContent = `${horas} horas y ${minutos} minutos`;

        document.getElementById("resultTarifa").textContent = `$${tarifa.toFixed(2)}`;
        document.getElementById('costoTotal').textContent = `$${costo.toFixed(2)}`;
        cajaResultado.style.display = 'block';
    }


    //funcione para calculos
    function convertir24Horas(hora, minuto, periodo) {
        let horas = hora;

        // Normalizar a mayúsculas para evitar errores
        const per = periodo.toUpperCase();

        if (per === 'AM') {
            if (hora === 12) {
                horas = 0; // 12 AM es 0:00
            }
        } else { // PM
            if (hora !== 12) {
                horas = hora + 12; // Convertir a 24 horas (excepto 12 PM)
            }
        }

        return {
            horas: horas,
            minutos: minuto
        };
    }

    function formatearTiempo(hora, minuto, periodo) {
        return `${hora}:${minuto.toString().padStart(2, '0')} ${periodo}`;
    }



    //boton para poner la hora actual
    document.getElementById('horaActualBtn').addEventListener('click', function () {
        const ahora = new Date();
        let hora = ahora.getHours();      // 0 - 23
        const minuto = ahora.getMinutes(); // 0 - 59
        let periodo = 'AM';

        // Convertir de 24h a 12h con AM/PM
        if (hora === 0) {
            hora = 12; // medianoche 0:xx -> 12 AM
        } else if (hora >= 12) {
            periodo = 'PM';
            if (hora > 12) {
                hora = hora - 12;
            }
        }

        // Poner valores en los inputs de salida
        document.getElementById('horaSalida').value = hora.toString();
        document.getElementById('minutosSalida').value = minuto.toString().padStart(2, '0');
        document.getElementById('periodoSalida').value = periodo.toUpperCase();  
    });

    //para calcular el costo:
    function calcularCostoEspecial(horas, minutos, tarifaBase) {
        if (horas === 0 && minutos > 0) {
            // Menos de una hora, siempre se cobra tarifa base
            return tarifaBase;
        }
        
        if (horas === 0 && minutos === 0) {
            // Tiempo 0, no cobrar
            return 0;
        }

        // Costo por la primera hora
        let costo = tarifaBase;

        // Horas completas después de la primera
        let horasExtras = horas > 1 ? horas - 1 : 0;

        // Cada hora extra a 20 Bs (o tarifaBase - 10 en tu ejemplo)
        costo += horasExtras * 20;

        // Minutos extra después de la última hora completa
        if (minutos >= 24) {
            // Cobrar una hora extra completa
            costo += 20;
        } else if (minutos >= 17 && minutos <= 23) {
            // Cobrar extra fijo (10 Bs)
            costo += 10;
        } // de 0 a 16 minutos no se cobra nada extra

        return costo;
    }

});