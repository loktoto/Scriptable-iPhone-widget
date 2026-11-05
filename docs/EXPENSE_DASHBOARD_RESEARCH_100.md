# Expense Dashboard Design Research — 100-source reference map

**Date:** 2026-11-05  
**Scope:** iPhone-first Scriptable Expense Tracker HK Dashboard v3.14.0  
**Deliverable:** Research-to-implementation traceability + exactly 100 distinct source pages.

## Research approach and confidence
This is a curated reading/reference map of **100 distinct official guideline or research pages** from publisher-controlled websites, rather than 100 independent experiments or 100 different publishing organizations. Links were collected/verified from their publishers’ site indexes and targeted web lookup; the **core sources directly used for decisions** are identified below. The remaining WCAG success-criterion and component pages are implementation/reference checks, not claims that each independently validates the chosen visual style. Some design pages require JavaScript to render, and no user-identifiable finance data was sent to any website.

### Eight design decisions grounded in the strongest sources
1. **At-a-glance first.** Hero current-month HKD net spend, today, recent-seven-day comparison; low-priority diagnostics collapsed. [NN/g dashboard charts](https://www.nngroup.com/articles/dashboards-preattentive/) · [Tableau best practices](https://help.tableau.com/current/pro/desktop/en-us/dashboards_best_practices.htm).
2. **Purposeful chart choice.** A small daily trend graph + ranked category bars are easier to compare than two oversized bar cards or a large donut. Donut is secondary, behind disclosure. [Apple Charts](https://developer.apple.com/design/human-interface-guidelines/charts) · [NN/g choosing chart types](https://www.nngroup.com/articles/choosing-chart-types/) · [IBM Carbon data-viz chart types](https://v10.carbondesignsystem.com/data-visualization/chart-types/).
3. **Mobile-sized content, not desktop squeezed.** One-column vertical flow, portrait safe area below native Scriptable WebView chrome, large input target sizes, no clipped KPI numbers. [Apple Layout](https://developer.apple.com/design/human-interface-guidelines/layout) · [Tableau device layout](https://help.tableau.com/current/pro/desktop/en-us/dashboards_dsd_create.htm) · [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow).
4. **Luxury without chartjunk.** Quiet near-black surface, small coordinated accent palette (mint / violet / amber), restrained borders, gradients only on the principal money summary; custom category tints only where they convey categories. [Apple Color](https://developer.apple.com/design/human-interface-guidelines/color) · [NN/g Clutter-Free](https://www.nngroup.com/articles/clutter-charts/).
5. **Comparison over circular storytelling.** Ranked horizontal bars expose category amounts, and the full 12-category navigator keeps blank fields quietly empty; donut supplementary. [NN/g Dashboards](https://www.nngroup.com/articles/dashboards-preattentive/) · [Tableau Visual Best Practices](https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm).
6. **Direct interaction, no feature loss.** Search across Merchant Type, Card, Payment Type and Remark; selected category/payment chips act as filters with a visible clear button. Edit, left-swipe Delete and its confirmation remain. [Carbon Search](https://www.carbondesignsystem.com/building-blocks/core/components/search/guidelines) · [Baymard mobile filtering](https://baymard.com/research/mcommerce-usability).
7. **Data honesty.** No fabricated zero spend for missing values; pending FX excluded from HKD total with transparent status; refund (negative) separate. Empty periods show helpful compact states. [NN/g Empty States](https://www.nngroup.com/articles/empty-state-interface-design/) · [W3C Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color).
8. **Accessible by design.** Semantic headings, meaningful chart aria-labels, visible focus, independent text labels, adequate control targets and safe non-text contrast. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).

### Product-specific data constraints
- **Canonical food Merchant Type = `食飯`**, not 食物, across manual input, dropdowns, charts and display. Historic 食物/餐飲/Restaurants values map to 食飯 only at display/normalization boundaries; no bulk rewrite of persisted rows.
- Payment methods remain open text. The original Card is preserved, custom Payment Type takes precedence over inferred Card type, e.g., Payme must not collapse to 電子錢包.
- Preserve local storage, Apple Intelligence/Tap Card Dictionary contract, negative refunds, nonzero amounts, original Numbers six-column append contract, dated source IDs and safe disk writes.
- All design decisions can be reversed without affecting user data.

## Publisher/source distribution

| Publisher | Linked pages | Role |
|---|---:|---|
| W3C WAI WCAG 2.2 Understanding | 40 | Accessible structure, contrast, interaction, labeling, error handling |
| IBM Carbon Design System | 30 | Reusable components and interaction models |
| Apple Human Interface Guidelines | 14 | iPhone layout, visual hierarchy, controls and charts |
| Nielsen Norman Group | 12 | Empirical usability/UX writing and dashboard cognitive principles |
| Tableau / Baymard Institute | 4 | Dashboard layout, mobile device handling and mobile search/filter |
| **Total** | **100** | **Distinct URLs; bibliography, not independent studies** |

## Indexed sources (all individually linked)

001. **WCAG 2.2 / W3C WAI** — [Understanding — non text content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content)
002. **WCAG 2.2 / W3C WAI** — [Understanding — info and relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships)
003. **WCAG 2.2 / W3C WAI** — [Understanding — meaningful sequence](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence)
004. **WCAG 2.2 / W3C WAI** — [Understanding — sensory characteristics](https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics)
005. **WCAG 2.2 / W3C WAI** — [Understanding — orientation](https://www.w3.org/WAI/WCAG22/Understanding/orientation)
006. **WCAG 2.2 / W3C WAI** — [Understanding — identify input purpose](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose)
007. **WCAG 2.2 / W3C WAI** — [Understanding — use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)
008. **WCAG 2.2 / W3C WAI** — [Understanding — contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)
009. **WCAG 2.2 / W3C WAI** — [Understanding — resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text)
010. **WCAG 2.2 / W3C WAI** — [Understanding — images of text](https://www.w3.org/WAI/WCAG22/Understanding/images-of-text)
011. **WCAG 2.2 / W3C WAI** — [Understanding — reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow)
012. **WCAG 2.2 / W3C WAI** — [Understanding — non text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
013. **WCAG 2.2 / W3C WAI** — [Understanding — text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing)
014. **WCAG 2.2 / W3C WAI** — [Understanding — content on hover or focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus)
015. **WCAG 2.2 / W3C WAI** — [Understanding — keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard)
016. **WCAG 2.2 / W3C WAI** — [Understanding — no keyboard trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap)
017. **WCAG 2.2 / W3C WAI** — [Understanding — character key shortcuts](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts)
018. **WCAG 2.2 / W3C WAI** — [Understanding — pause stop hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide)
019. **WCAG 2.2 / W3C WAI** — [Understanding — animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions)
020. **WCAG 2.2 / W3C WAI** — [Understanding — bypass blocks](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks)
021. **WCAG 2.2 / W3C WAI** — [Understanding — page titled](https://www.w3.org/WAI/WCAG22/Understanding/page-titled)
022. **WCAG 2.2 / W3C WAI** — [Understanding — focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order)
023. **WCAG 2.2 / W3C WAI** — [Understanding — link purpose in context](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context)
024. **WCAG 2.2 / W3C WAI** — [Understanding — multiple ways](https://www.w3.org/WAI/WCAG22/Understanding/multiple-ways)
025. **WCAG 2.2 / W3C WAI** — [Understanding — headings and labels](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels)
026. **WCAG 2.2 / W3C WAI** — [Understanding — focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)
027. **WCAG 2.2 / W3C WAI** — [Understanding — focus not obscured minimum](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
028. **WCAG 2.2 / W3C WAI** — [Understanding — pointer gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures)
029. **WCAG 2.2 / W3C WAI** — [Understanding — pointer cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation)
030. **WCAG 2.2 / W3C WAI** — [Understanding — label in name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name)
031. **WCAG 2.2 / W3C WAI** — [Understanding — dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)
032. **WCAG 2.2 / W3C WAI** — [Understanding — target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
033. **WCAG 2.2 / W3C WAI** — [Understanding — language of page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page)
034. **WCAG 2.2 / W3C WAI** — [Understanding — on focus](https://www.w3.org/WAI/WCAG22/Understanding/on-focus)
035. **WCAG 2.2 / W3C WAI** — [Understanding — on input](https://www.w3.org/WAI/WCAG22/Understanding/on-input)
036. **WCAG 2.2 / W3C WAI** — [Understanding — consistent navigation](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation)
037. **WCAG 2.2 / W3C WAI** — [Understanding — consistent identification](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification)
038. **WCAG 2.2 / W3C WAI** — [Understanding — error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification)
039. **WCAG 2.2 / W3C WAI** — [Understanding — labels or instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions)
040. **WCAG 2.2 / W3C WAI** — [Understanding — error prevention legal financial data](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data)
041. **IBM Carbon Design System** — [Component — accordion](https://www.carbondesignsystem.com/building-blocks/core/components/accordion/guidelines)
042. **IBM Carbon Design System** — [Component — button](https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines)
043. **IBM Carbon Design System** — [Component — checkbox](https://www.carbondesignsystem.com/building-blocks/core/components/checkbox/guidelines)
044. **IBM Carbon Design System** — [Component — contained list](https://www.carbondesignsystem.com/building-blocks/core/components/contained-list/guidelines)
045. **IBM Carbon Design System** — [Component — content switcher](https://www.carbondesignsystem.com/building-blocks/core/components/content-switcher/guidelines)
046. **IBM Carbon Design System** — [Component — data table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines)
047. **IBM Carbon Design System** — [Component — date picker](https://www.carbondesignsystem.com/building-blocks/core/components/date-picker/guidelines)
048. **IBM Carbon Design System** — [Component — dropdown](https://www.carbondesignsystem.com/building-blocks/core/components/dropdown/guidelines)
049. **IBM Carbon Design System** — [Component — form](https://www.carbondesignsystem.com/building-blocks/core/components/form/guidelines)
050. **IBM Carbon Design System** — [Component — inline loading](https://www.carbondesignsystem.com/building-blocks/core/components/inline-loading/guidelines)
051. **IBM Carbon Design System** — [Component — link](https://www.carbondesignsystem.com/building-blocks/core/components/link/guidelines)
052. **IBM Carbon Design System** — [Component — list](https://www.carbondesignsystem.com/building-blocks/core/components/list/guidelines)
053. **IBM Carbon Design System** — [Component — loading](https://www.carbondesignsystem.com/building-blocks/core/components/loading/guidelines)
054. **IBM Carbon Design System** — [Component — menu](https://www.carbondesignsystem.com/building-blocks/core/components/menu/guidelines)
055. **IBM Carbon Design System** — [Component — modal](https://www.carbondesignsystem.com/building-blocks/core/components/modal/guidelines)
056. **IBM Carbon Design System** — [Component — multiselect](https://www.carbondesignsystem.com/building-blocks/core/components/multiselect/guidelines)
057. **IBM Carbon Design System** — [Component — notification](https://www.carbondesignsystem.com/building-blocks/core/components/notification/guidelines)
058. **IBM Carbon Design System** — [Component — number input](https://www.carbondesignsystem.com/building-blocks/core/components/number-input/guidelines)
059. **IBM Carbon Design System** — [Component — pagination](https://www.carbondesignsystem.com/building-blocks/core/components/pagination/guidelines)
060. **IBM Carbon Design System** — [Component — popover](https://www.carbondesignsystem.com/building-blocks/core/components/popover/guidelines)
061. **IBM Carbon Design System** — [Component — progress bar](https://www.carbondesignsystem.com/building-blocks/core/components/progress-bar/guidelines)
062. **IBM Carbon Design System** — [Component — radio button](https://www.carbondesignsystem.com/building-blocks/core/components/radio-button/guidelines)
063. **IBM Carbon Design System** — [Component — search](https://www.carbondesignsystem.com/building-blocks/core/components/search/guidelines)
064. **IBM Carbon Design System** — [Component — select](https://www.carbondesignsystem.com/building-blocks/core/components/select/guidelines)
065. **IBM Carbon Design System** — [Component — slider](https://www.carbondesignsystem.com/building-blocks/core/components/slider/guidelines)
066. **IBM Carbon Design System** — [Component — structured list](https://www.carbondesignsystem.com/building-blocks/core/components/structured-list/guidelines)
067. **IBM Carbon Design System** — [Component — tabs](https://www.carbondesignsystem.com/building-blocks/core/components/tabs/guidelines)
068. **IBM Carbon Design System** — [Component — tag](https://www.carbondesignsystem.com/building-blocks/core/components/tag/guidelines)
069. **IBM Carbon Design System** — [Component — text input](https://www.carbondesignsystem.com/building-blocks/core/components/text-input/guidelines)
070. **IBM Carbon Design System** — [Component — tile](https://www.carbondesignsystem.com/building-blocks/core/components/tile/guidelines)
071. **Apple Human Interface Guidelines** — [HIG — charts](https://developer.apple.com/design/human-interface-guidelines/charts)
072. **Apple Human Interface Guidelines** — [HIG — layout](https://developer.apple.com/design/human-interface-guidelines/layout)
073. **Apple Human Interface Guidelines** — [HIG — color](https://developer.apple.com/design/human-interface-guidelines/color)
074. **Apple Human Interface Guidelines** — [HIG — typography](https://developer.apple.com/design/human-interface-guidelines/typography)
075. **Apple Human Interface Guidelines** — [HIG — accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
076. **Apple Human Interface Guidelines** — [HIG — buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
077. **Apple Human Interface Guidelines** — [HIG — labels](https://developer.apple.com/design/human-interface-guidelines/labels)
078. **Apple Human Interface Guidelines** — [HIG — lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
079. **Apple Human Interface Guidelines** — [HIG — segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls)
080. **Apple Human Interface Guidelines** — [HIG — tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
081. **Apple Human Interface Guidelines** — [HIG — search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)
082. **Apple Human Interface Guidelines** — [HIG — text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields)
083. **Apple Human Interface Guidelines** — [HIG — menus](https://developer.apple.com/design/human-interface-guidelines/menus)
084. **Apple Human Interface Guidelines** — [HIG — toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
085. **Nielsen Norman Group** — [Research — dashboards preattentive](https://www.nngroup.com/articles/dashboards-preattentive/)
086. **Nielsen Norman Group** — [Research — clutter charts](https://www.nngroup.com/articles/clutter-charts/)
087. **Nielsen Norman Group** — [Research — choosing chart types](https://www.nngroup.com/articles/choosing-chart-types/)
088. **Nielsen Norman Group** — [Research — contrast charts](https://www.nngroup.com/articles/contrast-charts/)
089. **Nielsen Norman Group** — [Research — complex application design](https://www.nngroup.com/articles/complex-application-design/)
090. **Nielsen Norman Group** — [Research — empty state interface design](https://www.nngroup.com/articles/empty-state-interface-design/)
091. **Nielsen Norman Group** — [Research — progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
092. **Nielsen Norman Group** — [Research — find navigation mobile even hamburger](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/)
093. **Nielsen Norman Group** — [Research — optimizing a screen for mobile use](https://www.nngroup.com/articles/optimizing-a-screen-for-mobile-use/)
094. **Nielsen Norman Group** — [Research — minimize cognitive load](https://www.nngroup.com/articles/minimize-cognitive-load/)
095. **Nielsen Norman Group** — [Research — designing effective infographics](https://www.nngroup.com/articles/designing-effective-infographics/)
096. **Nielsen Norman Group** — [Research — quantitative research study guide](https://www.nngroup.com/articles/quantitative-research-study-guide/)
097. **Tableau** — [Visual best practices](https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm)
098. **Tableau** — [Dashboard best practices](https://help.tableau.com/current/pro/desktop/en-us/dashboards_best_practices.htm)
099. **Tableau** — [Device-specific dashboard layouts](https://help.tableau.com/current/pro/desktop/en-us/dashboards_dsd_create.htm)
100. **Baymard Institute** — [Mobile ecommerce usability guidelines](https://baymard.com/research/mcommerce-usability)

## Acceptance checklist
- No overlap with native Scriptable toolbar on 375px–430px phones; hero and Quick Add comfortably readable.
- 12 Merchant Type tiles present, **食飯** replaces 食物 everywhere in current UI; historical raw JSON preserved.
- Payment Type and Card remain distinguishable; any custom name accepted; merchant, time, amount, remark searchable.
- Main card total is based on HKD-converted records only; pending FX/status is honest.
- Zero data yields descriptive compact empty states; zero/invalid amount never inserted, refunds are accepted.
- WebView controls work without external assets, network calls or third-party chart libraries.
- Test source/mirror parity, versioning, Shortcuts imports, editor, delete, manual entry, responsive UI and screenshot regression where possible.
