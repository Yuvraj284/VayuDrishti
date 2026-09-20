# Lambda container image. A zip package cannot be used here: CPU torch alone is
# well past the 250 MB unzipped layer limit, while the container limit is 10 GB.
FROM public.ecr.aws/lambda/python:3.12

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ${LAMBDA_TASK_ROOT}/app/

CMD ["app.handler.lambda_handler"]
