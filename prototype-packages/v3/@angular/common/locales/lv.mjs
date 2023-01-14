/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// THIS CODE IS GENERATED - DO NOT MODIFY.
const u = undefined;
function plural(val) {
    const n = val, v = val.toString().replace(/^[^.]*\.?/, '').length, f = parseInt(val.toString().replace(/^[^.]*\.?/, ''), 10) || 0;
    if (n % 10 === 0 || (n % 100 === Math.floor(n % 100) && (n % 100 >= 11 && n % 100 <= 19) || v === 2 && (f % 100 === Math.floor(f % 100) && (f % 100 >= 11 && f % 100 <= 19))))
        return 0;
    if (n % 10 === 1 && !(n % 100 === 11) || (v === 2 && (f % 10 === 1 && !(f % 100 === 11)) || !(v === 2) && f % 10 === 1))
        return 1;
    return 5;
}
export default ["lv", [["priekšp.", "pēcp."], u, ["priekšpusdienā", "pēcpusdienā"]], [["priekšp.", "pēcpusd."], u, ["priekšpusdiena", "pēcpusdiena"]], [["S", "P", "O", "T", "C", "P", "S"], ["svētd.", "pirmd.", "otrd.", "trešd.", "ceturtd.", "piektd.", "sestd."], ["svētdiena", "pirmdiena", "otrdiena", "trešdiena", "ceturtdiena", "piektdiena", "sestdiena"], ["Sv", "Pr", "Ot", "Tr", "Ce", "Pk", "Se"]], [["S", "P", "O", "T", "C", "P", "S"], ["Svētd.", "Pirmd.", "Otrd.", "Trešd.", "Ceturtd.", "Piektd.", "Sestd."], ["Svētdiena", "Pirmdiena", "Otrdiena", "Trešdiena", "Ceturtdiena", "Piektdiena", "Sestdiena"], ["Sv", "Pr", "Ot", "Tr", "Ce", "Pk", "Se"]], [["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"], ["janv.", "febr.", "marts", "apr.", "maijs", "jūn.", "jūl.", "aug.", "sept.", "okt.", "nov.", "dec."], ["janvāris", "februāris", "marts", "aprīlis", "maijs", "jūnijs", "jūlijs", "augusts", "septembris", "oktobris", "novembris", "decembris"]], u, [["p.m.ē.", "m.ē."], u, ["pirms mūsu ēras", "mūsu ērā"]], 1, [6, 0], ["dd.MM.yy", "y. 'gada' d. MMM", "y. 'gada' d. MMMM", "EEEE, y. 'gada' d. MMMM"], ["HH:mm", "HH:mm:ss", "HH:mm:ss z", "HH:mm:ss zzzz"], ["{1} {0}", u, u, u], [",", " ", ";", "%", "+", "-", "E", "×", "‰", "∞", "NS", ":"], ["#,##0.###", "#,##0%", "#,##0.00 ¤", "#E0"], "EUR", "€", "eiro", { "AUD": ["AU$", "$"], "BYN": [u, "р."], "GHS": [], "LVL": ["Ls"], "PHP": [u, "₱"], "THB": ["฿"], "TWD": ["NT$"] }, "ltr", plural];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibHYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21tb24vbG9jYWxlcy9sdi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCwwQ0FBMEM7QUFDMUMsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDO0FBRXBCLFNBQVMsTUFBTSxDQUFDLEdBQVc7SUFDM0IsTUFBTSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFbEksSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pLLE9BQU8sQ0FBQyxDQUFDO0lBQ2IsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkgsT0FBTyxDQUFDLENBQUM7SUFDYixPQUFPLENBQUMsQ0FBQztBQUNULENBQUM7QUFFRCxlQUFlLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUMsT0FBTyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsZ0JBQWdCLEVBQUMsYUFBYSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsVUFBVSxFQUFDLFVBQVUsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLGdCQUFnQixFQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDLEdBQUcsQ0FBQyxFQUFDLENBQUMsUUFBUSxFQUFDLFFBQVEsRUFBQyxPQUFPLEVBQUMsUUFBUSxFQUFDLFVBQVUsRUFBQyxTQUFTLEVBQUMsUUFBUSxDQUFDLEVBQUMsQ0FBQyxXQUFXLEVBQUMsV0FBVyxFQUFDLFVBQVUsRUFBQyxXQUFXLEVBQUMsYUFBYSxFQUFDLFlBQVksRUFBQyxXQUFXLENBQUMsRUFBQyxDQUFDLElBQUksRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFDLElBQUksRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDLEdBQUcsQ0FBQyxFQUFDLENBQUMsUUFBUSxFQUFDLFFBQVEsRUFBQyxPQUFPLEVBQUMsUUFBUSxFQUFDLFVBQVUsRUFBQyxTQUFTLEVBQUMsUUFBUSxDQUFDLEVBQUMsQ0FBQyxXQUFXLEVBQUMsV0FBVyxFQUFDLFVBQVUsRUFBQyxXQUFXLEVBQUMsYUFBYSxFQUFDLFlBQVksRUFBQyxXQUFXLENBQUMsRUFBQyxDQUFDLElBQUksRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFDLElBQUksRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxDQUFDLEVBQUMsQ0FBQyxPQUFPLEVBQUMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLEVBQUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLEVBQUMsTUFBTSxFQUFDLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxFQUFDLE1BQU0sQ0FBQyxFQUFDLENBQUMsVUFBVSxFQUFDLFdBQVcsRUFBQyxPQUFPLEVBQUMsU0FBUyxFQUFDLE9BQU8sRUFBQyxRQUFRLEVBQUMsUUFBUSxFQUFDLFNBQVMsRUFBQyxZQUFZLEVBQUMsVUFBVSxFQUFDLFdBQVcsRUFBQyxXQUFXLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsUUFBUSxFQUFDLE1BQU0sQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLGlCQUFpQixFQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsVUFBVSxFQUFDLGtCQUFrQixFQUFDLG1CQUFtQixFQUFDLHlCQUF5QixDQUFDLEVBQUMsQ0FBQyxPQUFPLEVBQUMsVUFBVSxFQUFDLFlBQVksRUFBQyxlQUFlLENBQUMsRUFBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxFQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDLElBQUksRUFBQyxHQUFHLENBQUMsRUFBQyxDQUFDLFdBQVcsRUFBQyxRQUFRLEVBQUMsWUFBWSxFQUFDLEtBQUssQ0FBQyxFQUFDLEtBQUssRUFBQyxHQUFHLEVBQUMsTUFBTSxFQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsS0FBSyxFQUFDLEdBQUcsQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUMsRUFBRSxFQUFDLEtBQUssRUFBQyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsRUFBQyxHQUFHLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxHQUFHLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxLQUFLLENBQUMsRUFBQyxFQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyBUSElTIENPREUgSVMgR0VORVJBVEVEIC0gRE8gTk9UIE1PRElGWS5cbmNvbnN0IHUgPSB1bmRlZmluZWQ7XG5cbmZ1bmN0aW9uIHBsdXJhbCh2YWw6IG51bWJlcik6IG51bWJlciB7XG5jb25zdCBuID0gdmFsLCB2ID0gdmFsLnRvU3RyaW5nKCkucmVwbGFjZSgvXlteLl0qXFwuPy8sICcnKS5sZW5ndGgsIGYgPSBwYXJzZUludCh2YWwudG9TdHJpbmcoKS5yZXBsYWNlKC9eW14uXSpcXC4/LywgJycpLCAxMCkgfHwgMDtcblxuaWYgKG4gJSAxMCA9PT0gMCB8fCAobiAlIDEwMCA9PT0gTWF0aC5mbG9vcihuICUgMTAwKSAmJiAobiAlIDEwMCA+PSAxMSAmJiBuICUgMTAwIDw9IDE5KSB8fCB2ID09PSAyICYmIChmICUgMTAwID09PSBNYXRoLmZsb29yKGYgJSAxMDApICYmIChmICUgMTAwID49IDExICYmIGYgJSAxMDAgPD0gMTkpKSkpXG4gICAgcmV0dXJuIDA7XG5pZiAobiAlIDEwID09PSAxICYmICEobiAlIDEwMCA9PT0gMTEpIHx8ICh2ID09PSAyICYmIChmICUgMTAgPT09IDEgJiYgIShmICUgMTAwID09PSAxMSkpIHx8ICEodiA9PT0gMikgJiYgZiAlIDEwID09PSAxKSlcbiAgICByZXR1cm4gMTtcbnJldHVybiA1O1xufVxuXG5leHBvcnQgZGVmYXVsdCBbXCJsdlwiLFtbXCJwcmlla8WhcC5cIixcInDEk2NwLlwiXSx1LFtcInByaWVrxaFwdXNkaWVuxIFcIixcInDEk2NwdXNkaWVuxIFcIl1dLFtbXCJwcmlla8WhcC5cIixcInDEk2NwdXNkLlwiXSx1LFtcInByaWVrxaFwdXNkaWVuYVwiLFwicMSTY3B1c2RpZW5hXCJdXSxbW1wiU1wiLFwiUFwiLFwiT1wiLFwiVFwiLFwiQ1wiLFwiUFwiLFwiU1wiXSxbXCJzdsSTdGQuXCIsXCJwaXJtZC5cIixcIm90cmQuXCIsXCJ0cmXFoWQuXCIsXCJjZXR1cnRkLlwiLFwicGlla3RkLlwiLFwic2VzdGQuXCJdLFtcInN2xJN0ZGllbmFcIixcInBpcm1kaWVuYVwiLFwib3RyZGllbmFcIixcInRyZcWhZGllbmFcIixcImNldHVydGRpZW5hXCIsXCJwaWVrdGRpZW5hXCIsXCJzZXN0ZGllbmFcIl0sW1wiU3ZcIixcIlByXCIsXCJPdFwiLFwiVHJcIixcIkNlXCIsXCJQa1wiLFwiU2VcIl1dLFtbXCJTXCIsXCJQXCIsXCJPXCIsXCJUXCIsXCJDXCIsXCJQXCIsXCJTXCJdLFtcIlN2xJN0ZC5cIixcIlBpcm1kLlwiLFwiT3RyZC5cIixcIlRyZcWhZC5cIixcIkNldHVydGQuXCIsXCJQaWVrdGQuXCIsXCJTZXN0ZC5cIl0sW1wiU3bEk3RkaWVuYVwiLFwiUGlybWRpZW5hXCIsXCJPdHJkaWVuYVwiLFwiVHJlxaFkaWVuYVwiLFwiQ2V0dXJ0ZGllbmFcIixcIlBpZWt0ZGllbmFcIixcIlNlc3RkaWVuYVwiXSxbXCJTdlwiLFwiUHJcIixcIk90XCIsXCJUclwiLFwiQ2VcIixcIlBrXCIsXCJTZVwiXV0sW1tcIkpcIixcIkZcIixcIk1cIixcIkFcIixcIk1cIixcIkpcIixcIkpcIixcIkFcIixcIlNcIixcIk9cIixcIk5cIixcIkRcIl0sW1wiamFudi5cIixcImZlYnIuXCIsXCJtYXJ0c1wiLFwiYXByLlwiLFwibWFpanNcIixcImrFq24uXCIsXCJqxatsLlwiLFwiYXVnLlwiLFwic2VwdC5cIixcIm9rdC5cIixcIm5vdi5cIixcImRlYy5cIl0sW1wiamFudsSBcmlzXCIsXCJmZWJydcSBcmlzXCIsXCJtYXJ0c1wiLFwiYXByxKtsaXNcIixcIm1haWpzXCIsXCJqxatuaWpzXCIsXCJqxatsaWpzXCIsXCJhdWd1c3RzXCIsXCJzZXB0ZW1icmlzXCIsXCJva3RvYnJpc1wiLFwibm92ZW1icmlzXCIsXCJkZWNlbWJyaXNcIl1dLHUsW1tcInAubS7Eky5cIixcIm0uxJMuXCJdLHUsW1wicGlybXMgbcWrc3UgxJNyYXNcIixcIm3Fq3N1IMSTcsSBXCJdXSwxLFs2LDBdLFtcImRkLk1NLnl5XCIsXCJ5LiAnZ2FkYScgZC4gTU1NXCIsXCJ5LiAnZ2FkYScgZC4gTU1NTVwiLFwiRUVFRSwgeS4gJ2dhZGEnIGQuIE1NTU1cIl0sW1wiSEg6bW1cIixcIkhIOm1tOnNzXCIsXCJISDptbTpzcyB6XCIsXCJISDptbTpzcyB6enp6XCJdLFtcInsxfSB7MH1cIix1LHUsdV0sW1wiLFwiLFwiwqBcIixcIjtcIixcIiVcIixcIitcIixcIi1cIixcIkVcIixcIsOXXCIsXCLigLBcIixcIuKInlwiLFwiTlNcIixcIjpcIl0sW1wiIywjIzAuIyMjXCIsXCIjLCMjMCVcIixcIiMsIyMwLjAwwqDCpFwiLFwiI0UwXCJdLFwiRVVSXCIsXCLigqxcIixcImVpcm9cIix7XCJBVURcIjpbXCJBVSRcIixcIiRcIl0sXCJCWU5cIjpbdSxcItGALlwiXSxcIkdIU1wiOltdLFwiTFZMXCI6W1wiTHNcIl0sXCJQSFBcIjpbdSxcIuKCsVwiXSxcIlRIQlwiOltcIuC4v1wiXSxcIlRXRFwiOltcIk5UJFwiXX0sXCJsdHJcIiwgcGx1cmFsXTtcbiJdfQ==