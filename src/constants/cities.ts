export const cityOptionsMap = {
  Australia: [
    { label: { en: "Melbourne", zh: "墨尔本" }, value: "Melbourne" },
    { label: { en: "Sydney", zh: "悉尼" }, value: "Sydney" },
    { label: { en: "Brisbane", zh: "布里斯班" }, value: "Brisbane" },
    { label: { en: "Adelaide", zh: "阿德莱德" }, value: "Adelaide" },
    { label: { en: "Perth", zh: "珀斯" }, value: "Perth" },
    { label: { en: "Gold Coast", zh: "黄金海岸" }, value: "Gold Coast" },
    { label: { en: "Newcastle", zh: "纽卡斯尔" }, value: "Newcastle" },
    { label: { en: "Canberra", zh: "堪培拉" }, value: "Canberra" },
    { label: { en: "Wollongong", zh: "卧龙岗" }, value: "Wollongong" },
    { label: { en: "Hobart", zh: "霍巴特" }, value: "Hobart" }
  ],
  China: [
    { label: { en: "Beijing", zh: "北京" }, value: "Beijing" },
    { label: { en: "Shanghai", zh: "上海" }, value: "Shanghai" },
    { label: { en: "Shenzhen", zh: "深圳" }, value: "Shenzhen" },
    { label: { en: "Guangzhou", zh: "广州" }, value: "Guangzhou" },
    { label: { en: "Chengdu", zh: "成都" }, value: "Chengdu" },
    { label: { en: "Hangzhou", zh: "杭州" }, value: "Hangzhou" },
    { label: { en: "Nanjing", zh: "南京" }, value: "Nanjing" },
    { label: { en: "Wuhan", zh: "武汉" }, value: "Wuhan" },
    { label: { en: "Xiamen", zh: "厦门" }, value: "Xiamen" },
    { label: { en: "Suzhou", zh: "苏州" }, value: "Suzhou" }
  ]
} as const;

export type CountryKey = keyof typeof cityOptionsMap; 