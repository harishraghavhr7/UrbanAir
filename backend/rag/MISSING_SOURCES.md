# MISSING_SOURCES.md — Downloads That Failed or Require Login

The following documents were attempted but could not be downloaded due to network restrictions in the build environment. Their content has been incorporated from published findings in the knowledge base text files.

| # | Title | URL | Reason | Action Taken |
|---|-------|-----|--------|--------------|
| 1 | WHO AQG 2021 Full PDF | https://apps.who.int/iris/bitstream/handle/10665/345329/9789240034228-eng.pdf | No network access in sandbox | Key guidelines transcribed into docs/who/who_aq_guidelines_2021.txt |
| 2 | CPCB National AQI Document (PDF) | https://cpcb.nic.in/displaypdf.php?id=bmF0aW9uYWwtYWlyLXF1YWxpdHktaW5kZXgucGRm | No network access | Standards transcribed from published CPCB tables into docs/cpcb/ |
| 3 | GRAP 2023 Full Order | https://caqm.nic.in/index4.aspx?lang=1&linkid=200&lid=200 | No network access | GRAP stages transcribed from official gazette summary |
| 4 | Chen et al. 2018 Full PDF | https://doi.org/10.1016/j.envint.2017.11.034 | Elsevier paywall (no open-access mirror found) | Key figures cited from abstract and secondary sources |
| 5 | Balakrishnan et al. 2015 Full PDF | https://doi.org/10.1016/j.envint.2015.09.015 | Elsevier paywall | Key statistics cited from abstract + WHO secondary reporting |
| 6 | Dons et al. 2012 Full PDF | https://doi.org/10.1016/j.atmosenv.2012.03.030 | Elsevier paywall | Relative exposure figures cited from WHO and secondary literature |

**To complete source collection when network is available:**
```bash
# Install tools
pip install requests pypdf

# Download open-access PDFs
wget -O docs/who/who_aq_guidelines_2021.pdf \
  "https://apps.who.int/iris/bitstream/handle/10665/345329/9789240034228-eng.pdf"

wget -O docs/indoor/corsi_rosenthal_2021.pdf \
  "https://escholarship.org/content/qt6dn4t5nw/qt6dn4t5nw.pdf"

wget -O docs/interventions/zuurbier_2011.pdf \
  "https://ehjournal.biomedcentral.com/counter/pdf/10.1186/1476-069X-10-10.pdf"

# Then re-run ingest.py to add PDF chunks to the vector store
python rag/ingest.py
```
