#!/bin/sh
# Import všetkých modelov z Meshy (GLB v priečinku $1) do js/data (plné) a js/data/lite (odľahčené pre hru v jednom súbore).
# Použitie: sh tools/import_all_models.sh /cesta/k/glb
D=${1:-models}; I="python3 tools/model_import.py"
imp() { f=$1; shift; $I "$D/$f" js/data/$OUT.js "$@" && $I "$D/$f" js/data/lite/$OUT.js "$@" --lite=0.45 --tex=256 > /dev/null; }
OUT=model_clovek   imp man.glb 25.5 --race=human --name=MODEL_CLOVEK
OUT=model_ork      imp orc.glb 24.5 --race=orc --name=MODEL_ORK
OUT=model_elf      imp Elf.glb 26.5 --race=elf --name=MODEL_ELF
OUT=model_hobit    imp Hobit.glb 17 --race=hobbit --name=MODEL_HOBIT
OUT=model_trpaslik imp Trpasl_k.glb 19 --race=dwarf --name=MODEL_TRPASLIK
OUT=model_uruk     imp Uruk-hai.glb 27 --race=uruk --name=MODEL_URUK
OUT=model_trol     imp Trol.glb 26 --race=troll --name=MODEL_TROL
OUT=model_nazgul   imp Nazghul.glb 27 --race=wraith --name=MODEL_NAZGUL
OUT=model_kral_trolov imp kral_trolov.glb 24 --race=troll --name=MODEL_KRAL_TROLOV
OUT=model_varg     imp Varg.glb 32 --kind=beast --race=varg --name=MODEL_VARG
OUT=model_olifant  imp Olifant.glb 72 --kind=beast --race=oliphant --name=MODEL_OLIFANT
OUT=model_ent      imp Ent.glb 64 --kind=beast --race=ent --name=MODEL_ENT
OUT=model_drak     imp drak.glb 91 --kind=beast --race=dragon --name=MODEL_DRAK
OUT=model_balrog   imp Balrog.glb 100 --kind=beast --race=balrog --name=MODEL_BALROG
OUT=model_bestia   imp okridlena_bestia.glb 71 --kind=beast --race=fell --name=MODEL_BESTIA
# kone (bez kĺbov – kostru herného koňa dostanú v hre); gondorský je modelovaný pozdĺž osi x (hlava na -x)
OUT=model_kon_ponik  imp ponik.glb 20 --kind=beast --race=ponik --name=MODEL_KON_PONIK
OUT=model_kon_rohan  imp rohan.glb 27 --kind=beast --race=rohan --name=MODEL_KON_ROHAN
OUT=model_kon_mearas imp mearas.glb 29 --kind=beast --race=mearas --name=MODEL_KON_MEARAS
OUT=model_kon_gondor imp gondor.glb 30 --kind=beast --race=gondor --name=MODEL_KON_GONDOR --fwd=-x
# zbrane dobra (--kind=prop: rukoväť v ruke, farby zapečené do vrcholov, zjednodušené na --tris; --grip=pole pre kopiju, sekeru a palicu s hrotom hore, --at = výška úchopu)
impw() { f=$1; shift; $I "$D/$f" js/data/$OUT.js "$@" --kind=prop && $I "$D/$f" js/data/lite/$OUT.js "$@" --kind=prop --tris=900 > /dev/null; }
OUT=model_w_zelezny_mec      impw w_zelezny_mec.glb 16 --name=MODEL_W_ZELEZNY_MEC
OUT=model_w_mec_strazcu      impw w_mec_strazcu.glb 16.5 --name=MODEL_W_MEC_STRAZCU
OUT=model_w_rohanska_kopija  impw w_rohanska_kopija.glb 43 --grip=pole --at=.3 --name=MODEL_W_ROHANSKA_KOPIJA
OUT=model_w_dunadansky_mec   impw w_dunadansky_mec.glb 18 --name=MODEL_W_DUNADANSKY_MEC
OUT=model_w_orcrist          impw w_orcrist.glb 18 --name=MODEL_W_ORCRIST
OUT=model_w_sekera_erebor    impw w_sekera_erebor.glb 15 --grip=pole --at=.16 --name=MODEL_W_SEKERA_EREBOR
OUT=model_w_glamdring        impw w_glamdring.glb 19 --name=MODEL_W_GLAMDRING
OUT=model_w_plamen_anoru     impw w_plamen_anoru.glb 22 --grip=pole --at=.32 --name=MODEL_W_PLAMEN_ANORU
OUT=model_w_anduril          impw w_anduril.glb 21 --name=MODEL_W_ANDURIL
OUT=model_w_gondor_obojrucny impw w_gondor_obojrucny.glb 23 --name=MODEL_W_GONDOR_OBOJRUCNY
