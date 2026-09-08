#!/usr/bin/env bash
# Baixa todas as mídias reais do site Wix (clubecriacionista.com) para assets/.
# Rode a partir da raiz do projeto:  bash scripts/fetch-media.sh
set -u

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
OUT_IMG="assets/wix"
OUT_VID="assets/video"
mkdir -p "$OUT_IMG" "$OUT_VID"

# --- Imagens do Wix: "arquivo-de-saida|media-id" ---------------------------
IMAGES="
post-egoismo.jpg|67f35a_6abe2394ec4542feb0a1c0665ac41091~mv2.jpg
post-arvore-extinta.jpg|67f35a_30324b0ffcc34163baa0783af4e78cdc~mv2.jpg
post-eras-petrificacao.jpg|67f35a_f034dc33d8f44d8fa11c26308b04abff~mv2.jpg
post-pica-pau.jpg|67f35a_cf4e1f052cd9483fa5db52d70930db16~mv2.jpg
post-aranhas.jpg|67f35a_70096ee3e5ea4eeb9ac8c69b6b417127~mv2.jpg
post-doutora-ra.jpg|67f35a_5c02cb8abf4f4c9e91082435da449552~mv2.jpg
post-evtol-pelicano.jpg|67f35a_17b7db7a195e44b38943dd15f0b1d327~mv2.jpg
post-arvores-evolutivas.png|67f35a_1f1eb24b5d3b40fd940f0c1934954318~mv2.png
post-astronauta-nasa.jpg|67f35a_69afa5b41f354951913d9804c6636988~mv2.jpg
post-criterios-animais.png|67f35a_2b5af477c74a488781bd0713a9fa8109~mv2.png
post-trapaceando-acaso.jpg|67f35a_a8c1acea93f34460ad49f28719f9c6ca~mv2.jpg
post-universo-ajustado.jpg|67f35a_11525b9cfd2a46839e80d29fc731d250~mv2.jpg
logo-wix.png|d49d42_26bdf518dbdd4e7f8ac10a1cfc336559~mv2.png
hero-banner.jpg|d49d42_548aac6a70fe4a63880f1ace26bddbc2~mv2.jpg
selo-pb.png|67f35a_e6aa4def7b984a0688b259d23d26d723~mv2.png
"

echo "== Imagens do Wix =="
for row in $IMAGES; do
  [ -z "$row" ] && continue
  name="${row%%|*}"
  id="${row#*|}"
  url="https://static.wixstatic.com/media/${id}"
  code=$(curl -sL -A "$UA" "$url" -o "$OUT_IMG/$name" -w "%{http_code}")
  size=$(wc -c < "$OUT_IMG/$name" 2>/dev/null || echo 0)
  echo "  [$code] $name (${size} bytes)"
done

# --- Thumbnails dos vídeos do YouTube --------------------------------------
VIDEOS="
qOcjNJO9Vfg
wERPHJ2NTNg
fWO82ksup8A
C2XY9QXwCuw
uHUaq7RowIU
iD_kdSfzx_U
xi7MdVqvERw
Uks6cUa9arA
"

echo "== Thumbnails do YouTube =="
for vid in $VIDEOS; do
  [ -z "$vid" ] && continue
  ok=0
  for q in maxresdefault hqdefault; do
    code=$(curl -sL -A "$UA" "https://i.ytimg.com/vi/$vid/$q.jpg" -o "$OUT_VID/$vid.jpg" -w "%{http_code}")
    size=$(wc -c < "$OUT_VID/$vid.jpg" 2>/dev/null || echo 0)
    if [ "$code" = "200" ] && [ "$size" -gt 3000 ]; then
      echo "  [$code] $vid.jpg ($q, ${size} bytes)"
      ok=1
      break
    fi
  done
  [ "$ok" = "0" ] && echo "  [FALHOU] $vid"
done

echo "Concluído."
