package org.bank.deposit.rest;

import org.bank.deposit.rest.dto.BillRequestDTO;
import org.bank.deposit.rest.dto.BillResponseDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import java.util.List;

@FeignClient(name = "bill-service", path = "/bills")
public interface BillServiceClient {

    @RequestMapping(value = "/{billId}", method = RequestMethod.GET)
    BillResponseDTO getBillById(@PathVariable("billId") Long id);

    @RequestMapping(value = "/{billId}", method = RequestMethod.PUT)
    void update(@PathVariable("billId") Long billId, @RequestBody BillRequestDTO bill);

    @RequestMapping(value = "/account/{accountId}", method = RequestMethod.GET)
    List<BillResponseDTO> getBillsByAccountId(@PathVariable("accountId") Long accountId);
}
