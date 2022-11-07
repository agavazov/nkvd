# [Tests](https://github.com/agavazov/nkvd/tree/main/packages/tests/)

### Integration tests

```shell
npm run test
```

or

```shell
docker compose run tests npm run stress
```

Expected output:

```
  /status
    Get node status
      ✔ Should return expected setting properties as a response

  /set command
    Successful record set
      ✔ Should save [empty value] without error
      ✔ Should save [normal value] without error
    UTF16 successful record set
      ✔ Should save [UTF8 key] and [UTF16 value] without error
      ✔ Should get the [UTF16 value] by the [UTF8 key] without error
    Fail scenarios
      ✔ Should respond with an error for [missing key]
      ✔ Should respond with an error for [empty key]
      ✔ Should respond with an error for [maximum key length] reached
      ✔ Should respond with an error for missing [value]
      ✔ Should respond with an error for [maximum value length] reached

  /get command
    Successful record get
      ✔ Should save [normal record] without error
      ✔ Should [get the same record] without error
    Missing record
      ✔ Should respond with an error for [missing record]
    Fail scenarios
      ✔ Should respond with an error for [missing key]
      ✔ Should respond with an error for [empty key]
      ✔ Should respond with an error for [maximum key length] reached

  /rm command
    Successful record remove
      ✔ Should save [normal record] without error
      ✔ Should [remove the same record] without error
      ✔ Should not allow to remove the same record again with [missing record] error
    Fail scenarios
      ✔ Should respond with an error for [missing key]
      ✔ Should respond with an error for [empty key]
      ✔ Should respond with an error for [maximum key length] reached

  /is command
    Successful record exist check
      ✔ Should save [normal record] without error
      ✔ Should find the [same exists record] without error
      ✔ Should [remove the same record] without error
      ✔ Should not allow to remove the same record again with [missing record] error
    Fail scenarios
      ✔ Should respond with an error for [missing key]
      ✔ Should respond with an error for [empty key]
      ✔ Should respond with an error for [maximum key length] reached

  /clear command
    Successful cleat all the records
      ✔ Should save [normal record] without error
      ✔ Should [get the some records] without error (121ms)
      ✔ Should [clear all records] without error

  /getKeys command
    Successful clear all the records
      ✔ Should [clear all records] without error
    Successful get all the keys
      ✔ Should save [TWICE 10 records] without error
      ✔ Should [get the SAME UNIQUE records keys] without error

  /getValues command
    Successful clear all the records
      ✔ Should [clear all records] without error
    Successful get all the values
      ✔ Should save [TWICE 10 records] without error
      ✔ Should [get the SAME UNIQUE records values] without error

  /getAll command
    Successful clear all the records
      ✔ Should [clear all records] without error
    Successful get all the records
      ✔ Should save [TWICE 10 records] without error
      ✔ Should [get the SAME UNIQUE records] without error

  41 passing
```

### Stress tests

```shell
npm run stress
```

or

```shell
docker compose run tests npm run stress
```

Expected output:

```
Stress test with:
 - Requests: 100000
 - Clusters: 50
 - Workers per cluster: 20

==================

[<] Left Requests / [!] Errors / [^] Success

[<] 99000 / [!] 0 / [^] 1000
[<] 98000 / [!] 0 / [^] 2000
[<] 97000 / [!] 0 / [^] 3000
...
...
[<] 3000 / [!] 8 / [^] 96992
[<] 2000 / [!] 9 / [^] 97991
[<] 1000 / [!] 9 / [^] 98991
[<] 0 / [!] 9 / [^] 99991

==================

Report:
 - Total requests: 100000
 - Total time: 98.92 sec
 - Avg request response: 0.33 ms
 - Errors: 9
 - Success: 99991
```

### .env variables

- `SERVICE_URL` The url of the service which will be tested
- `STRESS_AMOUNT` Total amount of the requests to send
- `STRESS_CLUSTERS` How many clusters will work in parallel
- `STERSS_WORKERS` Haw many requests workers will work in parallel in each cluster
