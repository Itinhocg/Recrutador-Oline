// 1. Inicializações
const supabaseUrl = "https://xwidfuieyleqfddsupnl.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aWRmdWlleWxlcWZkZHN1cG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Njg4NzAsImV4cCI6MjA4NzU0NDg3MH0.7OwPJNt7IOYXdjMh27gAlKz_vSwmsXD8iTJNNHXGBTs";

const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Inicializa EmailJS
emailjs.init("lycdmjrdHE0nwBOTT");

// Elementos da tela
const form = document.getElementById('formCandidato');
const btnEnviar = document.getElementById('btnEnviar');
const msgStatus = document.getElementById('msgStatus');

// ----------------------------------------------------
// MÁSCARA DE TELEFONE (Formatação Automática)
// ----------------------------------------------------
const inputTelefone = document.getElementById('telefone');

inputTelefone.addEventListener('input', function (e) {
  // 1. Remove tudo que não for número
  let valor = e.target.value.replace(/\D/g, '');
  
  // 2. Limita a 11 dígitos (DDD + 9 números)
  valor = valor.substring(0, 11);
  
  // 3. Aplica a formatação passo a passo
  if (valor.length === 0) {
    e.target.value = '';
    return;
  }
  
  if (valor.length <= 2) {
    e.target.value = `(${valor}`;
  } else if (valor.length <= 7) {
    e.target.value = `(${valor.substring(0, 2)}) ${valor.substring(2)}`;
  } else {
    e.target.value = `(${valor.substring(0, 2)}) ${valor.substring(2, 7)}-${valor.substring(7)}`;
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
   // ==========================================
  // TRAVA DE SEGURANÇA 1: Honeypot (Anti-Bot)
  // ==========================================
  const honeypot = document.getElementById('honeypot').value;
  if (honeypot !== "") {
    console.warn("Bloqueado: Atividade suspeita detectada.");
    // Finge que está enviando para enganar o bot, mas cancela a operação
    return; 
  }

  // ==========================================
  // TRAVA DE SEGURANÇA 2: Rate Limiting (Anti-Spam Manual)
  // ==========================================
  const ultimoEnvio = localStorage.getItem('lock_envio_cv');
  if (ultimoEnvio) {
    const tempoPassado = Date.now() - parseInt(ultimoEnvio);
    const tempoEspera = 5 * 60 * 1000; // 5 minutos 
    
    if (tempoPassado < tempoEspera) {
      alert("⏳ Você já enviou um currículo recentemente. Por favor, aguarde 5 minutos para enviar novamente.");
      return;
    }
  }
  console.log("Botão clicado! Iniciando processo...");

  const fileCurriculo = document.getElementById('curriculo').files[0];
  const fileVideo = document.getElementById('video').files[0];

  if (!fileCurriculo || !fileVideo) {
    alert("Por favor, anexe o currículo e o vídeo.");
    return;
  }

  // Trava de segurança (50MB)
  if (fileVideo.size > 50 * 1024 * 1024) { 
    alert('O vídeo é muito grande. O limite é 50MB.');
    return;
  }

  btnEnviar.disabled = true;
  msgStatus.style.color = '#0066cc';
  
  try {
    // Upload do Currículo
    msgStatus.innerText = 'Enviando currículo... (1/4)';
    console.log("Tentando subir o PDF...");
    const nomePdf = `${Date.now()}-cv-${fileCurriculo.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    
    const { data: cvData, error: cvError } = await clienteSupabase.storage
      .from('arquivos')
      .upload(nomePdf, fileCurriculo);
      
    if (cvError) throw cvError;
    console.log("PDF enviado com sucesso!");
    
    const { data: urlCv } = clienteSupabase.storage.from('arquivos').getPublicUrl(nomePdf);

    // Upload do Vídeo
    msgStatus.innerText = 'Enviando vídeo... Isso pode demorar (2/4)';
    console.log("Tentando subir o Vídeo...");
    const nomeVideo = `${Date.now()}-vid-${fileVideo.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    
    const { data: vidData, error: vidError } = await clienteSupabase.storage
      .from('arquivos')
      .upload(nomeVideo, fileVideo);
      
    if (vidError) throw vidError;
    console.log("Vídeo enviado com sucesso!");

    const { data: urlVideo } = clienteSupabase.storage.from('arquivos').getPublicUrl(nomeVideo);

    // Salvar dados no Banco de Dados
    msgStatus.innerText = 'Salvando candidatura... (3/4)';
    console.log("Salvando dados na tabela...");
    
    const objCandidato = {
      nome: document.getElementById('nome').value,
      email: document.getElementById('email').value,
      telefone: document.getElementById('telefone').value,
      idade: parseInt(document.getElementById('idade').value),
      sexo: document.getElementById('sexo').value,
      cargo: document.getElementById('cargo').value,
      curriculo_url: urlCv.publicUrl,
      video_url: urlVideo.publicUrl
    };

    const { error: dbError } = await clienteSupabase.from('candidatos').insert([objCandidato]);
    if (dbError) throw dbError;
    console.log("Dados salvos no banco com sucesso!");

    // Enviar E-mail de confirmação via EmailJS
    msgStatus.innerText = 'Notificando você por e-mail... (4/4)';
    console.log("Disparando emailJS...");
    
    await emailjs.send("service_dnul1wp", "template_djisfmf", {
      user_name: objCandidato.nome,
      user_email: objCandidato.email,
      cargo: objCandidato.cargo,
    });
    console.log("E-mail enviado!");

    // TRAVA DE SEGURANÇA: Registra a hora exata do envio bem-sucedido
    localStorage.setItem('lock_envio_cv', Date.now().toString());

    // SUCESSO! Redirecionar.
    window.location.href = 'obrigado.html';

  } catch (erro) {
    console.error("DEU ERRO AQUI OLHA:", erro);
    msgStatus.style.color = 'red';
    msgStatus.innerText = 'Erro: ' + (erro.message || 'Falha ao enviar. Tente novamente.');
    btnEnviar.disabled = false;
  }
});
