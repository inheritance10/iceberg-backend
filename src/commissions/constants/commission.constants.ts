/**
 * Komisyon dağıtım oranları
 * Şirket ve acenteler arasındaki paylaşım oranlarını tanımlar
 */
export const COMMISSION_RATIOS = {
  AGENCY: 0.5, // Şirket %50 alır
  AGENTS: 0.5, // Acenteler %50 alır
  AGENT_SPLIT: 0.5, // Farklı acenteler arasında %50-50 paylaşım
} as const;

/**
 * Acenteler arası paylaşım yüzdeleri
 * Toplam hizmet ücretine göre yüzde değerleri
 */
export const AGENT_PERCENTAGES = {
  SAME_AGENT: 50, // Aynı acente %50 alır (toplamın)
  DIFFERENT_AGENTS: 25, // Farklı acentelerden her biri %25 alır (toplamın)
} as const;

