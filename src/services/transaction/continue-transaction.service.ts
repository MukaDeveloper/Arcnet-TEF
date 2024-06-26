const qs = require("qs");
import { IContinueTransactionResponse } from "../../interfaces";
import { BaseService } from "../../shared/base";
import axios, { AxiosError } from "axios";
import { Agent } from "https";
import FinishTransaction from "./finish-transaction.service";

export default class ContinueTransaction extends BaseService {
  constructor() {
    super();
  }

  async execute(data: string) {
    /**
     * Comunicação com o agenteCliSiTef
     */
    try {
      /**
       * Requisição POST para o agenteCliSiTef
       */
      const section = this.section$;
      section.data = data;
      const res = await axios.post<any>(
        this.agenteUri + "/continueTransaction",
        qs.stringify(section),
        {
          httpsAgent: new Agent({ rejectUnauthorized: false }),
          headers: { 
            "Content-Type": "application/x-www-form-urlencoded",
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
          },
        }
      );
      const response = res?.data as IContinueTransactionResponse;
      if (response) {
        // && response.data != ""
        if (response.commandId != 0) {
            this.sendStatus(`${response.commandId} ${response.data}`);
        }
        if (response.serviceStatus != 0) {
          throw new Error(response.serviceMessage || "");
        }

        if (response.clisitefStatus != 10000) {
          if (response.clisitefStatus == 0) {
            this.sendApproved();
            const finish = new FinishTransaction();
            await finish.execute(1, false, false, section, this.transaction$);
          }
          // console.log(`Fim - Retorno: ${response.clisitefStatus}`);
          return `Fim - Retorno: ${response.clisitefStatus}`;
        }

        let lastStatus;
        if (response.commandId != 23) {
          lastStatus = "";
        }

        switch (response.commandId) {
          case 0:
            if (response.fieldId == 121) {
              this.sendStatus("Cupom Estabelecimento: \n" + response?.data);
            }

            if (response.fieldId == 122) {
              this.sendStatus("Cupom Cliente: \n" + response?.data);
            }
            this.execute("");
            break;
          case 1:
          case 2:
          case 3:
          case 4:
          case 15:
          case 11:
			    case 12:
			    case 13:
			    case 14:
			    case 16:
            this.execute("");
            break;
          case 20:
            // this.sendResponseRequest(response?.data);
            break;
            // setTimeout(() => { this.execute("0")}, 2000);
            // break;
          case 22:
            setTimeout(() => { this.execute("")}, 1000)
            break;
          case 23:
            const status = response?.data;
            if (lastStatus != status) {
              lastStatus = status;
            }
            setTimeout(() => {
              this.execute("");
            }, 1000);
            break;
          case 21:
          case 30:
          case 31:
          case 32:
          case 33:
          case 34:
          case 35:
          case 38:
            if (response.commandId === 21) {
              if (section.functionalId) {
                this.execute(section.functionalId);
              } else {
                // this.sendResponseRequest(response?.data);
              }
              break;
            }
            if (response.commandId === 34) {
              if (section.functionalType) {
                this.execute(section.functionalType);
              } else {
                // this.sendResponseRequest(response?.data);
              }
            }
            break;
          default:
            this.execute("");
        }
      } else {
        throw new Error("Erro ao continuar transação");
      }
    } catch (error: any) {
      /**
       * Retorno de erro do try/catch
       */
      const axiosError = error as AxiosError;
      /**
       * Função tipo guarda para verificar se o erro é um objeto com mensagem.
       */
      const isErrorWithMessage = (err: any): err is { message: string } =>
        error.message !== undefined;

      if (axiosError.response) {
        let message = `Error response from server: ${axiosError.response.status}`;
        console.error(message);

        /**
         * Verifique se a resposta de erro é um objeto com uma propriedade 'message'.
         */
        if (isErrorWithMessage(axiosError.response?.data)) {
          message = `Erro ao continuar transação: ${axiosError.response?.data.message}`;
          console.error(message);
        } else {
          /**
           * Se não for um objeto com 'message', apenas stringify o que quer que seja.
           */
          message = `Erro ao continuar transação: ${JSON.stringify(axiosError.response?.data)}`
          console.error(message);
        }
      } else if (axiosError.request) {
        console.error(`Nenhuma resposta do servidor ao continuar transação: ${axiosError.message}`);
      } else {
        console.error(`Erro ao configurar a requisição ao continuar transação: ${axiosError.message}`);
      }
      return axiosError?.message || error?.message || "Erro desconhecido";
    }
  }
}
