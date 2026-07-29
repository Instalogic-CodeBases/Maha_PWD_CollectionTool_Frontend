/* =============== SEED DATA =============== */
/* District -> Circle (नियंत्रक अधिकारी) mapping, sourced from the official Circle_List master. */
export const DISTRICT_ROWS = [
  ['मुंबई शहर', 'अ.अ., सा.बां.मंडळ, मुंबई'], ['मुंबई उपनगर', 'अ.अ., सा.बां.मंडळ, मुंबई'], ['ठाणे', 'अ.अ.सा.बां.मंडळ, ठाणे'], ['पालघर', 'अ.अ.सा.बां.मंडळ, ठाणे'], ['रायगड', 'अ.अ.सा.बां.मंडळ, रायगड'],
  ['रत्नागिरी', 'अ.अ.सा.बां.मंडळ, रत्नागिरी'], ['सिंधुदुर्ग', 'अ.अ.सा.बां.मंडळ, सिंधुदुर्ग'],
  ['पुणे', 'अ.अ.सा.बां.मंडळ, पुणे'], ['सातारा', 'अ.अ.सा.बां.मंडळ, सातारा'], ['सोलापूर', 'अ.अ.सा.बां.मंडळ, सोलापूर'], ['कोल्हापूर', 'अ.अ.सा.बां.मंडळ, कोल्हापूर'], ['सांगली', 'अ.अ.सा.बां.मंडळ, कोल्हापूर'],
  ['नाशिक', 'अ.अ.सा.बां.मंडळ, नाशिक'], ['अहिल्यानगर', 'अ.अ.सा.बां.मंडळ, अहिल्यानगर'], ['धुळे', 'अ.अ.सा.बां.मंडळ, धुळे'], ['नंदूरबार', 'अ.अ.सा.बां.मंडळ, धुळे'], ['जळगांव', 'अ.अ.सा.बां.मंडळ, जळगांव'],
  ['छ.संभाजीनगर', 'अ.अ.सा.बां.मं., छ. संभाजीनगर'], ['जालना', 'अ.अ.सा.बां.मं., छ. संभाजीनगर'], ['नांदेड', 'अ.अ.सा.बां.मंडळ, नांदेड'], ['परभणी', 'अ.अ.सा.बां.मंडळ, नांदेड'],
  ['हिंगोली', 'अ.अ.सा.बां.मंडळ, नांदेड'], ['धाराशिव', 'अ.अ.सा.बां.मंडळ, धाराशिव'], ['बीड', 'अ.अ.सा.बां.मंडळ, धाराशिव'], ['लातूर', 'अ.अ.सा.बां.मंडळ, लातूर'],
  ['अमरावती', 'अ.अ.सा.बां.मंडळ, अमरावती'], ['अकोला', 'अ.अ.सा.बां.मंडळ, अकोला'], ['वाशिम', 'अ.अ.सा.बां.मंडळ, अकोला'], ['बुलढाणा', 'अ.अ.सा.बां.मंडळ, अकोला'], ['यवतमाळ', 'अ.अ.सा.बां.मंडळ, यवतमाळ'],
  ['नागपूर', 'अ.अ.सा.बां.मंडळ, नागपूर'], ['वर्धा', 'अ.अ.सा.बां.मंडळ, चंद्रपूर'], ['भंडारा', 'अ.अ.सा.बां.मंडळ, नागपूर'], ['गोंदिया', 'अ.अ.सा.बां.मंडळ, नागपूर'], ['चंद्रपूर', 'अ.अ.सा.बां.मंडळ, चंद्रपूर'], ['गडचिरोली', 'अ.अ.सा.बां.मंडळ, गडचिरोली'],
];

/* Distinct list of Circles, derived from the mapping above (keeps Circle filter dropdowns in sync). */
export const CIRCLES = [...new Set(DISTRICT_ROWS.map((r) => r[1]))];

/* English names for districts, used only to accept English-language Excel entries during upload validation. */
export const DISTRICT_EN = {
  'मुंबई शहर': 'Mumbai City', 'मुंबई उपनगर': 'Mumbai Suburban', 'ठाणे': 'Thane', 'पालघर': 'Palghar', 'रायगड': 'Raigad', 'रत्नागिरी': 'Ratnagiri', 'सिंधुदुर्ग': 'Sindhudurg',
  'पुणे': 'Pune', 'सातारा': 'Satara', 'सोलापूर': 'Solapur', 'कोल्हापूर': 'Kolhapur', 'सांगली': 'Sangli',
  'नाशिक': 'Nashik', 'अहिल्यानगर': 'Ahilyanagar', 'धुळे': 'Dhule', 'नंदूरबार': 'Nandurbar', 'जळगांव': 'Jalgaon',
  'छ.संभाजीनगर': 'Chh. Sambhajinagar', 'जालना': 'Jalna', 'नांदेड': 'Nanded', 'परभणी': 'Parbhani', 'हिंगोली': 'Hingoli',
  'धाराशिव': 'Dharashiv', 'बीड': 'Beed', 'लातूर': 'Latur',
  'अमरावती': 'Amravati', 'अकोला': 'Akola', 'वाशिम': 'Washim', 'बुलढाणा': 'Buldhana', 'यवतमाळ': 'Yavatmal',
  'नागपूर': 'Nagpur', 'वर्धा': 'Wardha', 'भंडारा': 'Bhandara', 'गोंदिया': 'Gondia', 'चंद्रपूर': 'Chandrapur', 'गडचिरोली': 'Gadchiroli',
};

/* Known alternate / sub-region spellings that should resolve to a master district (e.g. Panvel -> Raigad). */
export const DISTRICT_ALIASES = {
  panvel: 'रायगड', 'पनवेल': 'रायगड',
  aurangabad: 'छ.संभाजीनगर', 'औरंगाबाद': 'छ.संभाजीनगर',
  osmanabad: 'धाराशिव', 'उस्मानाबाद': 'धाराशिव',
  ahmednagar: 'अहिल्यानगर', 'अहमदनगर': 'अहिल्यानगर',
};

/* Retained only as a fallback/reference (the live data comes from the backend). */
export const DEFAULT_COMPUTER_IDS = [
  { id: 'c1', computerId: '50540349', schemeName: 'राज्यमार्ग-रस्ते' },
  { id: 'c2', computerId: '50545331', schemeName: 'राज्यमार्ग-पूल' },
  { id: 'c3', computerId: '50540106', schemeName: 'प्रमुख जिल्हा मार्ग-रस्ते' },
  { id: 'c4', computerId: '50545369', schemeName: 'प्रमुख जिल्हा मार्ग-पूल' },
  { id: 'c5', computerId: '50540752', schemeName: 'नाबार्ड' },
  { id: 'c6', computerId: '30540238', schemeName: 'रेल्वे सुरक्षा कामे' },
  { id: 'c7', computerId: '30542947', schemeName: 'सेतुबंधन' },
  { id: 'c8', computerId: '30540078', schemeName: '(03) केंद्रीय मार्ग निधी' },
  { id: 'c9', computerId: '30540167', schemeName: '(04) केंद्रीय मार्ग निधी' },
];

export const DEFAULT_FIELDS = [
  { id: 'f1', key: 'district', marathi: 'जिल्हा', english: 'District', type: 'district', mandatory: true },
  { id: 'f2', key: 'department', marathi: 'विभागाचे नांव', english: 'Department Name', type: 'text', mandatory: true },
  { id: 'f3', key: 'schemeName', marathi: 'योजनेचे नाव', english: 'Scheme Name', type: 'scheme', mandatory: true },
  { id: 'f4', key: 'computerId', marathi: 'संगणक संकेतांक', english: 'Computer ID', type: 'computerId', mandatory: true },
  { id: 'f5', key: 'workId', marathi: 'वर्क ID', english: 'Work ID', type: 'text', mandatory: false },
  { id: 'f6', key: 'workName', marathi: 'कामाचे नाव', english: 'Work Name', type: 'text', mandatory: true },
  { id: 'f7', key: 'adminApprovalDate', marathi: 'प्रशासकीय मान्यतेचा दिनांक', english: 'Admin Approval Date', type: 'date', mandatory: true },
  { id: 'f8', key: 'estimatedCost', marathi: 'अंदाजित किंमत', english: 'Estimated Cost (Lakhs)', type: 'number', mandatory: true },
  { id: 'f9', key: 'expByMarch2026', marathi: 'माचे 2026 अखेर खर्च', english: 'Exp. till March 2026 (Lakhs)', type: 'number', mandatory: true },
  { id: 'f10', key: 'remainingCost', marathi: 'उर्वरित किंमत', english: 'Remaining Cost (auto = 8-9)', type: 'autoRemaining', mandatory: false },
  { id: 'f11', key: 'received2627', marathi: 'सन 2026-27 मध्ये प्राप्त', english: 'Received in 2026-27 (Lakhs)', type: 'number', mandatory: true },
  { id: 'f12', key: 'spent2627', marathi: 'सन 2026-27 मधील खर्च', english: 'Spent in 2026-27 (Lakhs)', type: 'number', mandatory: true },
  { id: 'f13', key: 'pendingAsOf', marathi: 'दि.09/07/26 च्या प्रलंबित देयकांची रक्कम', english: 'Pending Bills as of 09/07/26 (Lakhs)', type: 'number', mandatory: true },
  { id: 'f14', key: 'billReceivedDate', marathi: 'विभागात देयक प्राप्त झालेला दिनांक', english: 'Bill Received Date', type: 'date', mandatory: false },
  { id: 'f15', key: 'physicalProgress', marathi: 'कामाची भौतिक प्रगती (टक्केवारी)', english: 'Physical Progress (%)', type: 'number', mandatory: true },
  { id: 'f16', key: 'remarks', marathi: 'शेरा', english: 'Remarks', type: 'text', mandatory: false },
];

export const DEFAULT_USERS = [
  { id: 'u1', name: 'System Administrator', username: 'admin', password: 'admin', role: 'admin', districts: [] },
  { id: 'u2', name: 'Circle Officer Mumbai', username: 'officer', password: 'officer', role: 'officer', districts: ['मुंबई शहर', 'मुंबई उपनगर', 'ठाणे'] },
];
