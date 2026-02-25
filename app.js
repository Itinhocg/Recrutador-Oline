// 1. Inicializações (COLE SUAS CHAVES AQUI)
//const supabaseUrl = "https://xwidfuieyleqfddsupnl.supabase.co";
//const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aWRmdWlleWxlcWZkZHN1cG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Njg4NzAsImV4cCI6MjA4NzU0NDg3MH0.7OwPJNt7IOYXdjMh27gAlKz_vSwmsXD8iTJNNHXGBTs";
//const supabase = supabaseClient.createClient(supabaseUrl, supabaseKey);

// 1. Inicializações
const supabaseUrl = "https://xwidfuieyleqfddsupnl.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aWRmdWlleWxlcWZkZHN1cG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Njg4NzAsImV4cCI6MjA4NzU0NDg3MH0.7OwPJNt7IOYXdjMh27gAlKz_vSwmsXD8iTJNNHXGBTs";

// Usando 'window.supabase' para acessar a biblioteca que veio do HTML
// E mudando o nome da nossa variável para 'clienteSupabase' para não dar conflito

// CORREÇÃO APLICADA AQUI:
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Inicializa EmailJS
emailjs.init("lycdmjrdHE0nwBOTT");

// Elementos da tela
const form = document.getElementById('formCandidato');
const btnEnviar = document.getElementById('btnEnviar');
const msgStatus = document.getElementById('msgStatus');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
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
    // PASSO 1: Upload do Currículo
    msgStatus.innerText = 'Enviando currículo... (1/4)';
    console.log("Tentando subir o PDF...");
    const nomePdf = `${Date.now()}-cv-${fileCurriculo.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    
    // USANDO A VARIÁVEL CORRIGIDA AQUI
    const { data: cvData, error: cvError } = await clienteSupabase.storage
      .from('arquivos')
      .upload(nomePdf, fileCurriculo);
      
    if (cvError) throw cvError;
    console.log("PDF enviado com sucesso!");
    
    // USANDO A VARIÁVEL CORRIGIDA AQUI
    const { data: urlCv } = clienteSupabase.storage.from('arquivos').getPublicUrl(nomePdf);

    // PASSO 2: Upload do Vídeo
    msgStatus.innerText = 'Enviando vídeo... Isso pode demorar (2/4)';
    console.log("Tentando subir o Vídeo...");
    const nomeVideo = `${Date.now()}-vid-${fileVideo.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    
    // USANDO A VARIÁVEL CORRIGIDA AQUI
    const { data: vidData, error: vidError } = await clienteSupabase.storage
      .from('arquivos')
      .upload(nomeVideo, fileVideo);
      
    if (vidError) throw vidError;
    console.log("Vídeo enviado com sucesso!");

    // USANDO A VARIÁVEL CORRIGIDA AQUI
    const { data: urlVideo } = clienteSupabase.storage.from('arquivos').getPublicUrl(nomeVideo);

    // PASSO 3: Salvar dados no Banco de Dados
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

    // USANDO A VARIÁVEL CORRIGIDA AQUI
    const { error: dbError } = await clienteSupabase.from('candidatos').insert([objCandidato]);
    if (dbError) throw dbError;
    console.log("Dados salvos no banco com sucesso!");

    // PASSO 4: Enviar E-mail de confirmação via EmailJS
    msgStatus.innerText = 'Notificando você por e-mail... (4/4)';
    console.log("Disparando emailJS...");
    
    await emailjs.send("service_dnul1wp", "template_djisfmf", {
      user_name: objCandidato.nome,
      user_email: objCandidato.email,
      cargo: objCandidato.cargo,
    });
    console.log("E-mail enviado!");

    // SUCESSO! Redirecionar.
    window.location.href = 'obrigado.html';

  } catch (erro) {
    console.error("DEU ERRO AQUI OLHA:", erro);
    msgStatus.style.color = 'red';
    msgStatus.innerText = 'Erro: ' + (erro.message || 'Falha ao enviar. Tente novamente.');
    btnEnviar.disabled = false;
  }
});
