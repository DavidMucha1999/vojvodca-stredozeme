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
