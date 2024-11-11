
```conf
exten => _X.,1,NoOp(Start Answering Machine Detection)
same => n,Answer()
same => n,AMD() ; Run AMD detection

; Set a variable to indicate if it’s a human or machine
same => n,Set(isHuman=${IF($["${AMDSTATUS}"="HUMAN"]?1:0)})

; Pass control to the Stasis application
same => n,Stasis(my_stasis_app,${isHuman}) ; Pass `isHuman` as an argument
```