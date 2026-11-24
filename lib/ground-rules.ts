// The academy's official ground rules ("नियम व शर्तें"), in the same order
// and numbering as the printed rules board at the ground. Each rule is given
// in English and in the original Hindi. Keep both in step with the board.

export type GroundRule = {
  title: string;
  en: string;
  hi: string;
  points?: { en: string; hi: string }[];
  // Shown highlighted, as on the board.
  strict?: string;
  strictHi?: string;
};

export const groundRules: GroundRule[] = [
  {
    title: "Advance booking only",
    en: "The ground is available only on advance booking.",
    hi: "ग्राउंड केवल पूर्व बुकिंग (Advance Booking) पर ही उपलब्ध होगा।",
  },
  {
    title: "Advance payment confirms the booking",
    en: "Paying the advance (booking) amount is required to confirm a booking.",
    hi: "बुकिंग कन्फर्म करने के लिए अग्रिम राशि जमा करना अनिवार्य है।",
  },
  {
    title: "No refunds after confirmation",
    en: "Once a booking is confirmed, the amount paid will not be refunded.",
    hi: "एक बार बुकिंग कन्फर्म होने के बाद राशि वापस नहीं की जाएगी।",
  },
  {
    title: "Extra time is charged",
    en: "Playing beyond the scheduled time will be charged extra.",
    hi: "निर्धारित समय से अधिक खेलने पर अतिरिक्त शुल्क लिया जाएगा।",
  },
  {
    title: "No smoking or alcohol",
    en: "Smoking and drinking alcohol are completely banned at the ground. A player who comes to the ground after drinking alcohol will not be allowed to play, and their match will be cancelled immediately.",
    hi: "ग्राउंड में सिगरेट पीना एवं शराब का सेवन पूर्णतः प्रतिबंधित है। यदि कोई खिलाड़ी शराब पीकर मैदान में आता है, उसे मैच खेलने की अनुमति नहीं दी जाएगी तथा उसका मैच तुरंत रद्द कर दिया जाएगा।",
    strict: "If this rule is broken, the match will be cancelled immediately.",
    strictHi: "नियम का उल्लंघन होने पर मैच तुरंत रद्द कर दिया जाएगा।",
  },
  {
    title: "Damage to the ground",
    en: "If any damage is caused to the ground or its property, the full cost will be recovered from the team responsible.",
    hi: "ग्राउंड की संपत्ति को नुकसान पहुँचाने की स्थिति में पूरी भरपाई संबंधित टीम से की जाएगी।",
  },
  {
    title: "Sportsmanship",
    en: "All players must maintain sportsmanship at all times.",
    hi: "सभी खिलाड़ियों को खेल भावना (Sportsmanship) बनाकर रखना अनिवार्य है।",
  },
  {
    title: "Rain, natural disasters and technical problems",
    en: "If play is cancelled because of rain, a natural disaster or any technical reason, the decision of the management will be final.",
    hi: "बारिश, प्राकृतिक आपदा या किसी तकनीकी कारण से खेल रद्द होने पर प्रबंधन का निर्णय अंतिम होगा।",
  },
  {
    title: "If it rains",
    en: "In case of rain:",
    hi: "बारिश की स्थिति में –",
    points: [
      {
        en: "If it rains after 10 overs of the first innings have been completed, only 50% of the ground fee will be charged.",
        hi: "यदि प्रथम पारी (1st Innings) के 10 ओवर पूरे हो जाने के बाद बारिश होती है, तो ग्राउंड शुल्क का केवल 50% लिया जाएगा।",
      },
      {
        en: "The second innings will start only after the full payment has been made at the end of the first innings.",
        hi: "प्रथम पारी (1st Innings) समाप्त होने के बाद पूर्ण भुगतान जमा करने पर ही दूसरी पारी (2nd Innings) शुरू की जाएगी।",
      },
    ],
  },
  {
    title: "Floodlight problems",
    en: "If there is a problem with the lights from the academy's side, the match will restart from the same over at which play was stopped.",
    hi: "यदि लाइट से संबंधित कोई समस्या अकादमी की ओर से होती है, तो मैच उसी ओवर से दोबारा शुरू किया जाएगा, जहाँ से खेल रोका गया था।",
  },
  {
    title: "Rescheduled matches",
    en: "The match will be played on the day the ground is available.",
    hi: "यह मैच उसी दिन खेला जाएगा जिस दिन ग्राउंड उपलब्ध होगा।",
  },
  {
    title: "No spikes in corporate matches",
    en: "Wearing spiked shoes is completely banned in corporate matches.",
    hi: "कॉरपोरेट मैचों में स्पाइक्स जूते पहनना पूर्णतः प्रतिबंधित है।",
  },
  {
    title: "Keep the ground clean",
    en: "If a team litters the ground during a corporate match, a fine of up to ₹1,000 will be charged to that team.",
    hi: "यदि कॉरपोरेट मैच के दौरान टीम द्वारा ग्राउंड में गंदगी फैलाई जाती है, तो संबंधित टीम से ₹1000 तक जुर्माना वसूला जाएगा।",
  },
  {
    title: "No misbehaviour or fighting",
    en: "Any misbehaviour, argument or fight by a team with academy staff, or among the players themselves, is strictly prohibited.",
    hi: "टीम द्वारा अकादमी स्टाफ के साथ या आपस में किसी भी प्रकार का गलत व्यवहार, बहस या लड़ाई-झगड़ा करना सख्त मना है।",
  },
  {
    title: "Theft or loss of belongings",
    en: "The academy and its staff are not responsible for the theft or loss of any belongings.",
    hi: "किसी भी प्रकार के सामान की चोरी या खो जाने की जिम्मेदारी अकादमी या स्टाफ की नहीं होगी।",
  },
  {
    title: "Your belongings are your responsibility",
    en: "Each team is fully responsible for the safety of its own belongings.",
    hi: "अपने सामान की सुरक्षा की पूरी जिम्मेदारी संबंधित टीम की स्वयं होगी।",
  },
  {
    title: "Disputes",
    en: "In case of any dispute, the decision of CCS Academy Ground Management will be final and binding on everyone.",
    hi: "किसी भी प्रकार के विवाद की स्थिति में CCS Academy Ground Management का निर्णय अंतिम व सर्वमान्य होगा।",
  },
  {
    title: "Facilities",
    en: "CCS Academy provides players with canteen, hostel and school/management-related facilities.",
    hi: "CCS Academy द्वारा खिलाड़ियों को कैंटीन, हॉस्टल तथा स्कूल/मैनेजमेंट से संबंधित सुविधाएं प्रदान की जाती हैं।",
  },
  {
    title: "Stoppages in corporate matches",
    en: "If a corporate match is stopped because of any argument, dispute or discussion, the academy will not be responsible.",
    hi: "कॉरपोरेट मैच के दौरान यदि किसी भी प्रकार की बहस, विवाद या चर्चा के कारण मैच रुकता है, तो उसकी जिम्मेदारी अकादमी की नहीं होगी।",
  },
  {
    title: "Umpire's decision is final",
    en: "In such cases, the decision of the umpire and the ground management will be final.",
    hi: "ऐसे मामलों में अंपायर एवं ग्राउंड मैनेजमेंट का निर्णय अंतिम माना जाएगा।",
  },
];
