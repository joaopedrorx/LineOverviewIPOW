// Constantes de Engenharia
const CONST = {
    VOL_UN: 0.0033, // 330ml = 0.0033 HL
    FATOR_EPC1: 6,
    FATOR_EPC2: 24,
    FATOR_PALLET: 2016 // 84 * 24
};

// --- FUNÇÕES AUXILIARES SEGURAS (Defensive Coding) ---

// Retorna o valor numérico de um input, ou 0 se não existir ou for inválido
const getVal = (id) => {
    const el = document.getElementById(id);
    if (!el) return 0;
    return Number(el.value) || 0;
};

// Define o valor de um input se ele existir
const setValue = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
};

// Define o texto de um elemento se ele existir (Evita erro de null)
const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

// Define o HTML interno de um elemento se ele existir
const setHTML = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
};

// Formatadores
const fmtNum = (n) => n.toLocaleString('pt-BR');
const fmtVol = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoney = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function calcularTudo() {
    // --- 1. AQUISIÇÃO DE DADOS ---
    const inputs = {
        contIni: getVal('cont_ini'),
        contFim: getVal('cont_fim'),
        dpl: getVal('dpl_in'),
        ebi: { proc: getVal('ebi_proc'), prod: getVal('ebi_prod'), rej: getVal('ebi_rej') },
        ech: getVal('ech_env'),
        inspt: { proc: getVal('insp_proc'), prod: getVal('insp_prod'), rej: getVal('insp_rej') },
        rot1: { proc: getVal('rot1_proc'), prod: getVal('rot1_prod'), rej: getVal('rot1_rej') },
        rot2: { proc: getVal('rot2_proc'), prod: getVal('rot2_prod'), rej: getVal('rot2_rej') },
        epc1: getVal('epc1_packs'),
        epc2: getVal('epc2_packs'),
        pal: getVal('pal_packs'),
        env: getVal('env_pallets')
    };

    // Custos
    const costs = {
        liquid: getVal('cost_liquid'),
        bottle: getVal('cost_bottle'),
        cap: getVal('cost_cap'),
        labels: getVal('cost_label_neck') + getVal('cost_label_front') + getVal('cost_label_back'),
        card: getVal('cost_card')
    };

    // Conversões
    const epc1_garrafas = inputs.epc1 * CONST.FATOR_EPC1;
    const epc2_garrafas = inputs.epc2 * CONST.FATOR_EPC2;
    const pal_garrafas  = inputs.pal * CONST.FATOR_EPC2; 
    const env_garrafas  = inputs.env * CONST.FATOR_PALLET;

    const rot_total_proc = inputs.rot1.proc + inputs.rot2.proc;
    const rot_total_prod = inputs.rot1.prod + inputs.rot2.prod;
    const rot_total_rej  = inputs.rot1.rej + inputs.rot2.rej;

    // --- 2. CÁLCULO DE PERDAS (GAPS) ---
    const gap1 = Math.max(0, inputs.ech - inputs.inspt.proc); // Enchedora -> Inspt
    const gap2 = Math.max(0, inputs.inspt.prod - rot_total_proc); // Inspt -> Rot
    const gap3 = Math.max(0, rot_total_prod - epc1_garrafas); // Rot -> EPC1
    const gap4 = Math.max(0, epc1_garrafas - epc2_garrafas); // EPC1 -> EPC2
    const gap5 = Math.max(0, epc2_garrafas - pal_garrafas); // EPC2 -> PAL
    const gap6 = Math.max(0, pal_garrafas - env_garrafas); // PAL -> ENV

    const total_garrafas_quebra = gap1 + gap2 + gap3 + gap4 + gap5 + gap6;

    // --- 3. CÁLCULO DE REFUGOS (REJEITOS) ---
    const refugo_inspt = inputs.inspt.rej;
    const refugo_rot   = rot_total_rej;
    const total_refugo = refugo_inspt + refugo_rot;

    // --- 4. TOTAIS FÍSICOS ---
    const IPOW = total_garrafas_quebra + total_refugo; 
    const IPE_Vol = IPOW * CONST.VOL_UN; 
    const Vol_Envasado = inputs.ech * CONST.VOL_UN;
    const eficiencia = inputs.ech > 0 ? ((env_garrafas / inputs.ech) * 100).toFixed(1) : 0;

    // --- 5. CÁLCULO FINANCEIRO DETALHADO ---
    const costLiquidPerBottle = CONST.VOL_UN * costs.liquid;
    
    // Etapa 1: ECH -> INSPT
    const unitCost_Stage1 = costs.bottle + costs.cap + costLiquidPerBottle;
    
    // Etapa 2: INSPT -> ROT
    const unitCost_Stage2 = unitCost_Stage1;

    // Etapa 3: ROT -> EPC1
    const unitCost_Stage3 = unitCost_Stage2 + costs.labels;

    // Etapa 4: EPC1 -> Fim
    const cardCostPerBottle = (costs.card * 4) / 24;
    const unitCost_Stage4 = unitCost_Stage3; 
    const unitCost_Stage5_6 = unitCost_Stage3 + cardCostPerBottle;

    // Totais Financeiros por Trecho
    const cost_Gap1 = gap1 * unitCost_Stage1;
    const cost_Gap2 = gap2 * unitCost_Stage2;
    const cost_Gap3 = gap3 * unitCost_Stage3;
    const cost_Gap4 = gap4 * unitCost_Stage4;
    const cost_Gap5_6 = (gap5 + gap6) * unitCost_Stage5_6;

    const cost_Refugo_Inspt = refugo_inspt * unitCost_Stage1;
    const cost_Refugo_Rot = refugo_rot * unitCost_Stage3; 

    const total_Financial_Loss = cost_Gap1 + cost_Gap2 + cost_Gap3 + cost_Gap4 + cost_Gap5_6 + cost_Refugo_Inspt + cost_Refugo_Rot;

    // --- 6. RENDERIZAÇÃO SEGURA ---
    
    // KPIs
    setText('kpi-fin-total', fmtMoney(total_Financial_Loss));
    setText('kpi-ipe', fmtVol(IPE_Vol));
    setText('kpi-ipow', fmtNum(IPOW));
    setText('kpi-vol-real', fmtVol(Vol_Envasado));
    setText('kpi-efi', eficiencia + "%");

    // Alertas
    let alertsHTML = '';
    
    if (inputs.ech > inputs.ebi.prod) {
        alertsHTML += `<div class="alert alert-danger">⚠️ ALERTA DE QUALIDADE: Enchedora > EBI Produção. Possível Bypass!</div>`;
    }
    if (inputs.ebi.proc > inputs.dpl) {
            alertsHTML += `<div class="alert alert-info">ℹ️ RETORNO: EBI processou mais que DPL.</div>`;
    }
    setHTML('alert-section', alertsHTML);

    // Tabela Gaps
    const gapTableHTML = `
        <tr>
            <td>Enchedora ➔ InsptECH</td>
            <td class="num-cell">${fmtNum(gap1)}</td>
            <td class="num-cell">${fmtVol(gap1 * CONST.VOL_UN)}</td>
            <td>Liq + Garrafa + Tampa</td>
            <td class="money-cell">${fmtMoney(cost_Gap1)}</td>
        </tr>
        <tr>
            <td>InsptECH ➔ Rotuladoras</td>
            <td class="num-cell">${fmtNum(gap2)}</td>
            <td class="num-cell">${fmtVol(gap2 * CONST.VOL_UN)}</td>
            <td>Liq + Garrafa + Tampa</td>
            <td class="money-cell">${fmtMoney(cost_Gap2)}</td>
        </tr>
        <tr>
            <td>Rotuladoras ➔ EPC1</td>
            <td class="num-cell">${fmtNum(gap3)}</td>
            <td class="num-cell">${fmtVol(gap3 * CONST.VOL_UN)}</td>
            <td>+ Rótulos (Kit)</td>
            <td class="money-cell">${fmtMoney(cost_Gap3)}</td>
        </tr>
        <tr>
            <td>EPC1 ➔ EPC2</td>
            <td class="num-cell">${fmtNum(gap4)}</td>
            <td class="num-cell">${fmtVol(gap4 * CONST.VOL_UN)}</td>
            <td>Liq + Gfa + Tpa + Rót</td>
            <td class="money-cell">${fmtMoney(cost_Gap4)}</td>
        </tr>
            <tr>
            <td>Fim de Linha (EPC2 ➔ ENV)</td>
            <td class="num-cell">${fmtNum(gap5 + gap6)}</td>
            <td class="num-cell">${fmtVol((gap5 + gap6) * CONST.VOL_UN)}</td>
            <td>+ Embalagem (Cartão)</td>
            <td class="money-cell">${fmtMoney(cost_Gap5_6)}</td>
        </tr>
        <tr style="background-color:#f8f9fa; font-weight:bold;">
            <td colspan="4">TOTAL QUEBRA (FÍSICA)</td>
            <td class="money-cell">${fmtMoney(cost_Gap1 + cost_Gap2 + cost_Gap3 + cost_Gap4 + cost_Gap5_6)}</td>
        </tr>
    `;
    setHTML('gap-table-body', gapTableHTML);

    // Tabela Refugos
    const rejTableHTML = `
        <tr>
            <td>InsptECH (Nível/Tampa)</td>
            <td class="num-cell">${fmtNum(refugo_inspt)}</td>
            <td class="num-cell">${fmtVol(refugo_inspt * CONST.VOL_UN)}</td>
            <td class="money-cell">${fmtMoney(cost_Refugo_Inspt)}</td>
        </tr>
        <tr>
            <td>Rotuladoras (Rótulo)</td>
            <td class="num-cell">${fmtNum(refugo_rot)}</td>
            <td class="num-cell">${fmtVol(refugo_rot * CONST.VOL_UN)}</td>
            <td class="money-cell">${fmtMoney(cost_Refugo_Rot)}</td>
        </tr>
            <tr style="background-color:#f8f9fa; font-weight:bold;">
            <td colspan="3">TOTAL REFUGO</td>
            <td class="money-cell">${fmtMoney(cost_Refugo_Inspt + cost_Refugo_Rot)}</td>
        </tr>
    `;
    setHTML('rej-table-body', rejTableHTML);

    const panel = document.getElementById('results-panel');
    if (panel) {
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth' });
    }
}

function carregarExemplo() {
    // Usa setValue para evitar erros se os inputs não existirem
    setValue('cost_liquid', 198.00); 
    setValue('cost_bottle', 0.75);
    setValue('cost_cap', 0.05);
    setValue('cost_card', 0.40);
    
    setValue('cost_label_neck', 0.04);
    setValue('cost_label_front', 0.08);
    setValue('cost_label_back', 0.05);

    // Exemplo produção, 1000 garrafas perdidas.
    setValue('cont_ini', 1000);
    setValue('cont_fim', 1165); 
    setValue('dpl_in', 52000);
    setValue('ebi_proc', 52000);
    setValue('ebi_rej', 500);
    setValue('ebi_prod', 51500);
    setValue('ech_env', 51400); 
    setValue('insp_proc', 51350); 
    setValue('insp_rej', 200); 
    setValue('insp_prod', 51150); 
    setValue('rot1_proc', 25575); 
    setValue('rot2_proc', 25575); 
    setValue('rot1_rej', 50); 
    setValue('rot2_rej', 50); 
    setValue('rot1_prod', 25525); 
    setValue('rot2_prod', 25525); 
    setValue('epc1_packs', 8500);
    setValue('epc2_packs', 2125);
    setValue('pal_packs', 2125);
    setValue('env_pallets', 25);

    calcularTudo();
}