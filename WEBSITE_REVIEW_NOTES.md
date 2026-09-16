# Website review and deployment notes

## Sources applied
- Policy wording: supplied IMPEX_Policy_Pages_EN_AR.md, English and Arabic. Non-placeholder refund terms: 7-day request window for unstarted services, reply within 3 business days, processing within 5 business days after approval, bank posting 5–14 additional business days.
- Company name and registered address: supplied Emirates NBD letter dated 5 March 2026. Unified / Trade License Number: 7009444295, kept distinct from the CR.
- CR 2051221092 and contact email: existing project business information. The bank letter does not independently verify this CR.
- VAT 310154593300003: explicitly supplied by the user. Corrected the old malformed VAT number in existing English and Arabic business information.
- Phone: +966 54 146 3161 as requested.
- Service category prices: data/eligible-models.json, the same local catalog used by the eligibility endpoint. SAR 150–300. Actual warranty service is also checked against the existing external workflow.
- VAT-inclusive 15% wording: supplied policy draft. Confirm this against the actual charged prices before publishing. Separate inspection/pickup/parts charges have no authoritative fixed prices in the project and remain quotation-based; no example fees were adopted.
- Optional template values [30], [90], [3] were not adopted as new business promises. Warranty period refers to the approved quotation; uncollected goods/failed collections use non-numeric terms.
- Customer PDFs and account numbers are not copied into public assets.

## Remaining business confirmation
Confirm that the CR above is the CR for the bank-letter entity, that the bank-letter registered address is the desired public address, VAT inclusion in the catalog amounts, any fixed inspection/pickup charges, and the draft refund timing. The attached bank letter is not a VAT or CR certificate.

## Hosting scope
The user confirmed these changes are only for bot.impexksa.com. Leave impexksa.com, Shopify and DNS unchanged. No domain redirects are included.

## Deployment
Deploy this repository through the existing Vercel project serving bot.impexksa.com. Verify the five policy URLs and payment logos publicly after deployment. Confirm all displayed methods are enabled on the live Moyasar merchant account; adding marks does not enable payment methods.

No deployment was performed from this workspace.
