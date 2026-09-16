import assert from 'node:assert/strict';
const origin=process.env.CHECK_SITE_URL || 'http://localhost:3100';
const policies=['/services','/terms','/refund-policy','/cancellation-policy','/privacy'];
for(const route of ['/', ...policies, '/payment', '/register']) {
 const response=await fetch(origin+route); assert.equal(response.status,200,route);
 const html=await response.text();
 for(const link of policies) assert.ok(html.includes(`href="${link}?lang=en"`),`${route} footer missing ${link}`);
 assert.ok(html.includes('310154593300003'),`${route} missing merchant VAT`);
 assert.ok(!/\[(?:COMPANY|CR NUMBER|VAT NUMBER|ADDRESS|EMAIL|PHONE|EFFECTIVE DATE|e\.g\.|30|90|3)/.test(html),`${route} unresolved placeholder`);
 assert.ok(!html.includes('300000609300003'),`${route} must not use bank VAT`);
 if(route==='/payment') for(const logo of ['mada','visa','mastercard','apple-pay']) assert.ok(html.includes(`/payment-methods/${logo}.svg`),`missing ${logo}`);
 console.log(`PASS ${route}`);
}
for(const logo of ['mada','visa','mastercard','apple-pay']) {
 const response=await fetch(`${origin}/payment-methods/${logo}.svg`);
 assert.equal(response.status,200); assert.match(await response.text(),/<svg/); console.log(`PASS ${logo} asset`);
}
