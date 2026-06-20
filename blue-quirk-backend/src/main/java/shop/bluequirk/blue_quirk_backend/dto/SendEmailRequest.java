package shop.bluequirk.blue_quirk_backend.dto;

import java.util.Map;

public class SendEmailRequest {

    private String to;
    private String templateCode;
    private Map<String, String> variables;
	public String getTo() {
		return to;
	}
	public void setTo(String to) {
		this.to = to;
	}
	public String getTemplateCode() {
		return templateCode;
	}
	public void setTemplateCode(String templateCode) {
		this.templateCode = templateCode;
	}
	public Map<String, String> getVariables() {
		return variables;
	}
	public void setVariables(Map<String, String> variables) {
		this.variables = variables;
	}

}