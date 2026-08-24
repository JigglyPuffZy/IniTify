# HeatHits / IniTify — Research Document Summary

**Source file:** `heathits_.docx` (Cagayan National High School — Senior High, July 2026)

**Note:** The research paper names the system **HeatHits**. The mobile app is implemented as **IniTify** with the same documented requirements.

---

## What the document confirms

| Item | Documented |
|---|---|
| Purpose | Hybrid AI heat-risk monitoring + personalized alerts + emergency assistance |
| Heat data source | DOST-PAGASA (methodology also references **iHeatMAP**) |
| Inputs | Heat index, age, activity level, health condition, hydration status, GPS |
| AI model | Decision Tree → outputs **Low, Moderate, High, Extreme** |
| Activity levels | **Low, moderate, or high** (Definition of Terms) |
| Database | Firebase / MySQL |
| Test location | **Tuguegarao City, Cagayan** |
| Emergency triggers | Extreme risk + repeated failed safety prompts + prolonged inactivity |
| Recommendations | Hydration, rest, seeking shade, limiting outdoor activities |
| First-aid | Heat stroke guidance on emergency screen (content not included in Chapter 1) |
| Not a medical device | Decision-support / early-warning only |

---

## What is NOT in this document (still missing)

| Item | Status |
|---|---|
| **Decision Tree rules / branches / thresholds** | **NOT IN DOCUMENT** — methodology says model will be trained with dataset + confusion matrix, but the actual tree is not in Chapter 1 or Methodology |
| **Training dataset** | Not included |
| **Emergency numeric thresholds** | Not specified (failed prompt count, inactivity minutes) |
| **First-aid approved text** | Mentioned only, not written out |
| **Hospital / maps provider** | Google Maps cited in references only, not configured |

---

## Required from research group

1. **Decision Tree chapter or appendix** — tree diagram, rules, or exported model  
2. **Training dataset** — for AI validation (accuracy, precision, recall, F1)  
3. **Emergency threshold values** — if defined elsewhere in your paper  
4. **First-aid content** — approved text for heat stroke  

---

## Weather configuration for Tuguegarao testing

Live heat index uses WeatherAPI.com (not the DOST-PAGASA TenDay API):

```env
EXPO_PUBLIC_WEATHERAPI_KEY=your_weatherapi_key
```
