#!/usr/bin/env bash
cd ~/Git/beeapp_ai
python3 Backend/beeAppBack/scripts/test_s4_rpc_isolation_live.py > /home/andres-mendoza/Git/beeapp_ai/tmp/s4_rpc_isolation_results.txt
chmod 600 /home/andres-mendoza/Git/beeapp_ai/tmp/s4_rpc_isolation_results.txt
code /home/andres-mendoza/Git/beeapp_ai/tmp/s4_rpc_isolation_results.txt
